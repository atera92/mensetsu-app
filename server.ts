/**
 * server.ts (5段階評価・レーダーチャート対応)
 */
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  buildInterviewPrompt,
  buildJudgeContext,
  type InterviewSetup,
} from "./lib/interview";

dotenv.config({ path: ".env.local" });
const PORT = Number(process.env.PORT) || 8080;

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ エラー: APIキーが見つかりません");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ エラー: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const HOST = "generativelanguage.googleapis.com";
const PATH = "/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
const GEMINI_URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

// モデル設定
const TALK_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
const JUDGE_MODEL = "gemini-2.0-flash-exp";

const genAI = new GoogleGenerativeAI(API_KEY);
const judgeModel = genAI.getGenerativeModel({ model: JUDGE_MODEL });

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 3 * 60 * 1000;
const MAX_SESSION_MS = Number(process.env.MAX_SESSION_MS) || 15 * 60 * 1000;
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS) || 20;
const MAX_RECORDING_BYTES = Number(process.env.MAX_RECORDING_BYTES) || 32 * 1024 * 1024;
const DAILY_LIMIT_SECONDS = Number(process.env.DAILY_LIMIT_SECONDS) || 15 * 60;
const PREMIUM_DAILY_LIMIT_SECONDS =
  Number(process.env.PREMIUM_DAILY_LIMIT_SECONDS) || 120 * 60;
const AUDIO_WS_TOKEN = process.env.AUDIO_WS_TOKEN;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Session = {
  id: string;
  userId: string;
  deviceId: string;
  geminiWs: WebSocket;
  clientWs: WebSocket | null;
  recordingBuffer: Buffer[];
  recordingBytes: number;
  disconnectTimer: NodeJS.Timeout | null;
  maxDurationTimer: NodeJS.Timeout | null;
  dailyLimitTimer: NodeJS.Timeout | null;
  activeSince: number | null;
  accumulatedMs: number;
  dailyUsageSecondsAtStart: number;
  dailyLimitSeconds: number;
  systemPrompt: string;
  setup: InterviewSetup | null;
  isPremium: boolean;
  usageDateKey: string;
  usageFinalized: boolean;
  lastClientInfo: { ip: string; origin: string; userAgent: string } | null;
  closed: boolean;
};

const sessions = new Map<string, Session>();

const initialSetupMessage = {
  setup: {
    model: TALK_MODEL,
    generationConfig: { responseModalities: ["AUDIO"] },
  },
};

// 面接官のシステムプロンプトは lib/interview.ts の buildInterviewPrompt() で
// 接続ごとに（シナリオ・難易度・プレミアム個別化に応じて）動的に生成する。

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

console.log(`📞 面接サーバー(レーダーチャート対応)が起動しました :${PORT}`);

wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
  void handleConnection(clientWs, request);
});

async function handleConnection(clientWs: WebSocket, request: IncomingMessage) {
  const context = getRequestContext(request);
  if (!isOriginAllowed(context.origin)) {
    console.warn(`🚫 Origin blocked: ${context.origin || "unknown"}`);
    clientWs.close(1008, "origin not allowed");
    return;
  }
  if (AUDIO_WS_TOKEN && context.token !== AUDIO_WS_TOKEN) {
    console.warn(`🚫 Unauthorized token from ${context.ip}`);
    clientWs.close(1008, "unauthorized");
    return;
  }
  if (!context.authToken) {
    console.warn("🚫 Missing auth token");
    clientWs.close(1008, "missing auth");
    return;
  }
  if (!context.deviceId) {
    console.warn("🚫 Missing device id");
    clientWs.close(1008, "missing device");
    return;
  }

  const userId = await getUserIdFromToken(context.authToken);
  if (!userId) {
    console.warn("🚫 Invalid auth token");
    clientWs.close(1008, "invalid auth");
    return;
  }

  const deviceOk = await verifyDevice(userId, context.deviceId);
  if (!deviceOk) {
    console.warn(`🚫 Device mismatch (user=${userId})`);
    clientWs.close(1008, "device mismatch");
    return;
  }

  const plan = await getUserPlan(userId);
  const dailyLimitSeconds =
    plan === "premium" ? PREMIUM_DAILY_LIMIT_SECONDS : DAILY_LIMIT_SECONDS;

  const dateKey = getDateKey();
  const usedSeconds = await getDailyUsageSeconds(userId, dateKey);
  if (usedSeconds >= dailyLimitSeconds) {
    console.warn(`🚫 Daily limit reached (user=${userId}, plan=${plan})`);
    clientWs.close(1008, "daily limit reached");
    return;
  }

  const sessionId = getSessionId(context.url);
  let session = sessions.get(sessionId);
  const existingForUser = findSessionByUser(userId, sessionId);
  if (existingForUser) {
    console.warn(`🚫 User already has active session (user=${userId})`);
    clientWs.close(1008, "already in use");
    return;
  }

  if (!session && sessions.size >= MAX_SESSIONS) {
    console.warn("🚫 Max sessions reached");
    clientWs.close(1013, "server busy");
    return;
  }

  if (!session || session.closed || session.geminiWs.readyState === WebSocket.CLOSED) {
    if (session) cleanupSession(session, "stale");
    const isPremium = plan === "premium";
    const setup = await getInterviewSetup(userId, sessionId);
    const systemPrompt = buildInterviewPrompt(setup, isPremium);
    session = createSession(
      sessionId,
      userId,
      context.deviceId,
      usedSeconds,
      dailyLimitSeconds,
      dateKey,
      systemPrompt,
      setup,
      isPremium
    );
    sessions.set(sessionId, session);
  } else if (session.userId !== userId) {
    console.warn(`🚫 Session user mismatch (session=${sessionId})`);
    clientWs.close(1008, "session mismatch");
    return;
  }

  attachClient(session, clientWs, context);
}

function getSessionId(url: URL) {
  const sid = url.searchParams.get("sid");
  return sid && sid.length > 0 ? sid : randomUUID();
}

function getRequestContext(request: IncomingMessage) {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);
  const origin = request.headers.origin ?? "";
  const token = url.searchParams.get("token") ?? "";
  const authToken = url.searchParams.get("auth") ?? "";
  const deviceId = url.searchParams.get("device") ?? "";
  const ipHeader = request.headers["x-forwarded-for"];
  const ip = Array.isArray(ipHeader)
    ? ipHeader[0]
    : (ipHeader ?? request.socket.remoteAddress ?? "").toString().split(",")[0].trim();
  const userAgent = request.headers["user-agent"] ?? "";

  return { url, origin, token, authToken, deviceId, ip, userAgent };
}

function isOriginAllowed(origin: string) {
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function createSession(
  id: string,
  userId: string,
  deviceId: string,
  usedSeconds: number,
  dailyLimitSeconds: number,
  dateKey: string,
  systemPrompt: string,
  setup: InterviewSetup | null,
  isPremium: boolean
): Session {
  const geminiWs = new WebSocket(GEMINI_URL);
  const session: Session = {
    id,
    userId,
    deviceId,
    geminiWs,
    clientWs: null,
    recordingBuffer: [],
    recordingBytes: 0,
    disconnectTimer: null,
    maxDurationTimer: null,
    dailyLimitTimer: null,
    activeSince: null,
    accumulatedMs: 0,
    dailyUsageSecondsAtStart: usedSeconds,
    dailyLimitSeconds,
    systemPrompt,
    setup,
    isPremium,
    usageDateKey: dateKey,
    usageFinalized: false,
    lastClientInfo: null,
    closed: false,
  };

  console.log(`👤 新規セッション開始: ${id}`);
  session.maxDurationTimer = setTimeout(() => {
    if (session.closed) return;
    if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
      session.clientWs.close(1000, "max duration");
    }
    cleanupSession(session, "max-duration");
  }, MAX_SESSION_MS);

  geminiWs.on("open", () => {
    geminiWs.send(JSON.stringify(initialSetupMessage));
    geminiWs.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: session.systemPrompt }] }],
          turnComplete: true,
        },
      })
    );
  });

  geminiWs.on("message", (data: any) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
        const audioData = msg.serverContent.modelTurn.parts[0].inlineData.data;
        if (session.clientWs?.readyState === WebSocket.OPEN) {
          session.clientWs.send(data.toString());
        }
        appendRecording(session, Buffer.from(audioData, "base64"));
      }
    } catch {}
  });

  geminiWs.on("close", () => {
    if (session.closed) return;
    cleanupSession(session, "gemini-closed");
  });

  geminiWs.on("error", () => {
    if (session.closed) return;
    cleanupSession(session, "gemini-error");
  });

  return session;
}

function attachClient(session: Session, clientWs: WebSocket, context: ReturnType<typeof getRequestContext>) {
  if (session.disconnectTimer) {
    clearTimeout(session.disconnectTimer);
    session.disconnectTimer = null;
  }

  if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.close();
  }

  session.clientWs = clientWs;
  session.lastClientInfo = {
    ip: context.ip,
    origin: context.origin,
    userAgent: context.userAgent,
  };
  console.log(`🔌 接続: ${session.id} (ip=${context.ip || "unknown"})`);
  startUsageTimer(session);

  clientWs.on("message", (data: any) => {
    handleClientMessage(session, data);
  });

  clientWs.on("close", () => {
    session.clientWs = null;
    console.log(`🔌 切断: ${session.id}`);
    pauseUsageTimer(session);
    if (session.closed) {
      cleanupSession(session, "client-closed");
      return;
    }
    scheduleSessionExpiry(session);
  });
}

function handleClientMessage(session: Session, data: any) {
  try {
    const msg = JSON.parse(data.toString());

    if (msg.type === "FINISH_INTERVIEW") {
      console.log(`🛑 面接終了。採点を開始します... (${session.id})`);
      session.closed = true;
      if (session.disconnectTimer) {
        clearTimeout(session.disconnectTimer);
        session.disconnectTimer = null;
      }
      pauseUsageTimer(session);
      const judgeContext = buildJudgeContext(session.setup, session.isPremium);
      generateScore(session.recordingBuffer, judgeContext).then((feedback) => {
        if (feedback && session.clientWs?.readyState === WebSocket.OPEN) {
          session.clientWs.send(JSON.stringify({ type: "FEEDBACK_RESULT", data: feedback }));
        }
        void finalizeUsage(session);
        cleanupSession(session, "finished");
      });
      return;
    }

    if (msg.realtime_input?.media_chunks) {
      const audioData = msg.realtime_input.media_chunks[0].data;
      appendRecording(session, Buffer.from(audioData, "base64"));
      if (session.geminiWs.readyState === WebSocket.OPEN) {
        session.geminiWs.send(data);
      }
    }
  } catch {
    if (session.geminiWs.readyState === WebSocket.OPEN) {
      session.geminiWs.send(data);
    }
  }
}

function scheduleSessionExpiry(session: Session) {
  if (session.disconnectTimer) return;
  session.disconnectTimer = setTimeout(() => {
    session.closed = true;
    pauseUsageTimer(session);
    void finalizeUsage(session);
    cleanupSession(session, "timeout");
  }, SESSION_TTL_MS);
}

function appendRecording(session: Session, chunk: Buffer) {
  session.recordingBuffer.push(chunk);
  session.recordingBytes += chunk.length;
  while (session.recordingBytes > MAX_RECORDING_BYTES && session.recordingBuffer.length > 0) {
    const dropped = session.recordingBuffer.shift();
    if (!dropped) break;
    session.recordingBytes -= dropped.length;
  }
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function findSessionByUser(userId: string, currentSessionId: string) {
  for (const session of sessions.values()) {
    if (!session.closed && session.userId === userId && session.id !== currentSessionId) {
      return session;
    }
  }
  return null;
}

async function getUserIdFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function verifyDevice(userId: string, deviceId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_devices")
    .select("device_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.device_id !== deviceId) return false;

  await supabaseAdmin
    .from("user_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_id", deviceId);

  return true;
}

async function getDailyUsageSeconds(userId: string, dateKey: string) {
  const { data, error } = await supabaseAdmin
    .from("daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle();

  if (error) {
    console.error("daily_usage lookup error:", error.message);
    // 取得失敗時はプランに関わらず上限扱いにして安全側に倒す
    return Number.MAX_SAFE_INTEGER;
  }
  return data?.seconds_used ?? 0;
}

/**
 * subscriptions テーブルから現在の有効プランを判定する。
 * status が active/trialing かつ期間内なら premium、それ以外は free。
 * 失敗時は free（安全側）。
 */
async function getUserPlan(userId: string): Promise<"free" | "premium"> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return "free";

  const status = (data.status ?? "").toLowerCase();
  if (status !== "active" && status !== "trialing") return "free";
  if (data.current_period_end) {
    const end = new Date(data.current_period_end).getTime();
    if (Number.isFinite(end) && end < Date.now()) return "free";
  }
  return data.plan === "premium" ? "premium" : "free";
}

/**
 * このセッション用の面接設定を取得する（クライアントが接続前に保存している）。
 * 見つからなければ null（＝デフォルトの一般面接）。
 */
async function getInterviewSetup(
  userId: string,
  sessionId: string
): Promise<InterviewSetup | null> {
  const { data, error } = await supabaseAdmin
    .from("interview_setups")
    .select("scenario, difficulty, company, role, focus, material")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    scenario: data.scenario ?? "general",
    difficulty: data.difficulty ?? "normal",
    company: data.company ?? undefined,
    role: data.role ?? undefined,
    focus: data.focus ?? undefined,
    material: data.material ?? undefined,
  };
}

async function addDailyUsageSeconds(userId: string, dateKey: string, secondsToAdd: number) {
  if (secondsToAdd <= 0) return;
  const { data, error } = await supabaseAdmin
    .from("daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle();

  if (error) {
    console.error("daily_usage read error:", error.message);
    return;
  }

  const current = data?.seconds_used ?? 0;
  const next = current + secondsToAdd;

  if (data) {
    const { error: updateError } = await supabaseAdmin
      .from("daily_usage")
      .update({ seconds_used: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("date", dateKey);
    if (updateError) console.error("daily_usage update error:", updateError.message);
  } else {
    const { error: insertError } = await supabaseAdmin.from("daily_usage").insert({
      user_id: userId,
      date: dateKey,
      seconds_used: next,
      updated_at: new Date().toISOString(),
    });
    if (insertError) console.error("daily_usage insert error:", insertError.message);
  }
}

function startUsageTimer(session: Session) {
  if (session.activeSince) return;
  const remainingSeconds = getRemainingSeconds(session);
  if (remainingSeconds <= 0) {
    enforceDailyLimit(session);
    return;
  }
  session.activeSince = Date.now();
  scheduleDailyLimitTimer(session, remainingSeconds);
}

function pauseUsageTimer(session: Session) {
  if (session.activeSince) {
    session.accumulatedMs += Date.now() - session.activeSince;
    session.activeSince = null;
  }
  if (session.dailyLimitTimer) {
    clearTimeout(session.dailyLimitTimer);
    session.dailyLimitTimer = null;
  }
}

function getRemainingSeconds(session: Session) {
  const usedSeconds = session.dailyUsageSecondsAtStart + Math.floor(session.accumulatedMs / 1000);
  return session.dailyLimitSeconds - usedSeconds;
}

function scheduleDailyLimitTimer(session: Session, remainingSeconds: number) {
  if (session.dailyLimitTimer) {
    clearTimeout(session.dailyLimitTimer);
  }
  session.dailyLimitTimer = setTimeout(() => {
    enforceDailyLimit(session);
  }, remainingSeconds * 1000);
}

function enforceDailyLimit(session: Session) {
  if (session.closed) return;
  session.closed = true;
  pauseUsageTimer(session);
  void finalizeUsage(session);
  if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.close(1008, "daily limit reached");
  }
  cleanupSession(session, "daily-limit");
}

async function finalizeUsage(session: Session) {
  if (session.usageFinalized) return;
  session.usageFinalized = true;
  pauseUsageTimer(session);
  const secondsToAdd = Math.floor(session.accumulatedMs / 1000);
  await addDailyUsageSeconds(session.userId, session.usageDateKey, secondsToAdd);
}

function cleanupSession(session: Session, reason: string) {
  if (session.closed === false) {
    session.closed = true;
  }
  void finalizeUsage(session);
  if (session.disconnectTimer) {
    clearTimeout(session.disconnectTimer);
    session.disconnectTimer = null;
  }
  if (session.maxDurationTimer) {
    clearTimeout(session.maxDurationTimer);
    session.maxDurationTimer = null;
  }
  sessions.delete(session.id);
  if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.close();
  }
  if (session.geminiWs.readyState === WebSocket.OPEN || session.geminiWs.readyState === WebSocket.CONNECTING) {
    session.geminiWs.close();
  }
  console.log(`🧹 セッション終了: ${session.id} (${reason})`);
}

// --- 採点機能 (5段階評価を追加) ---
async function generateScore(audioBuffer: Buffer[], judgeContext = "") {
  try {
    if (audioBuffer.length === 0) return null;

    const fullAudio = Buffer.concat(audioBuffer);
    const wavBuffer = addWavHeader(fullAudio, 24000, 1, 16);
    const base64Audio = wavBuffer.toString("base64");

    const contextLine = judgeContext
      ? `\nこの面接の前提: ${judgeContext}\n「会社とのマッチ度(company_match)」は、この前提（応募先企業・職種）への適合度として評価してください。\n`
      : "";

    // ★ここを変更: 5つの指標をJSONスキーマに追加
    const prompt = `
あなたはベテラン面接官です。以下の音声は「模擬面接の録音データ」です。
この候補者のパフォーマンスを評価し、以下のJSON形式で出力してください。
**必ず日本語で出力すること。**
${contextLine}
{
  "score": 0〜100の整数,
  "metrics": {
    "voice_volume": 1〜5の整数 (声の大きさ),
    "response_quality": 1〜5の整数 (適切な応答),
    "company_match": 1〜5の整数 (会社とのマッチ度),
    "episodes": 1〜5の整数 (エピソードの具体性),
    "clarity": 1〜5の整数 (わかりやすさ)
  },
  "good_points": "評価できる点（1行）",
  "advice": "改善すべき点（辛口で1行）",
  "comment": "総評（1行）"
}
`;
    const result = await judgeModel.generateContent([
      { inlineData: { mimeType: "audio/wav", data: base64Audio } },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error("採点エラー:", e);
    return null;
  }
}

function addWavHeader(samples: Buffer, sampleRate: number, numChannels: number, bitDepth: number): Buffer {
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const buffer = Buffer.alloc(44 + samples.length);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples.length, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22); buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28); buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34); buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length, 40);
    samples.copy(buffer, 44);
    return buffer;
}
