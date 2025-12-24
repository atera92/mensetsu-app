/**
 * server.ts (5段階評価・レーダーチャート対応)
 */
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: ".env.local" });
const PORT = Number(process.env.PORT) || 8080;

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ エラー: APIキーが見つかりません");
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
const AUDIO_WS_TOKEN = process.env.AUDIO_WS_TOKEN;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type Session = {
  id: string;
  geminiWs: WebSocket;
  clientWs: WebSocket | null;
  recordingBuffer: Buffer[];
  recordingBytes: number;
  disconnectTimer: NodeJS.Timeout | null;
  maxDurationTimer: NodeJS.Timeout | null;
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

const systemPrompt = `
【重要設定】
言語: 日本語
役割: 厳格な採用担当「佐藤」
ルール:
- 必ず日本語で、落ち着いたトーンで話すこと。
- 候補者の発言に対しては、必ず「なるほど」「承知しました」などの相槌を打ってから次の質問に移ること。
`;

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

console.log(`📞 面接サーバー(レーダーチャート対応)が起動しました :${PORT}`);

wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
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
  const sessionId = getSessionId(context.url);
  let session = sessions.get(sessionId);
  if (!session && sessions.size >= MAX_SESSIONS) {
    console.warn("🚫 Max sessions reached");
    clientWs.close(1013, "server busy");
    return;
  }

  if (!session || session.closed || session.geminiWs.readyState === WebSocket.CLOSED) {
    if (session) cleanupSession(session, "stale");
    session = createSession(sessionId);
    sessions.set(sessionId, session);
  }

  attachClient(session, clientWs, context);
});

function getSessionId(url: URL) {
  const sid = url.searchParams.get("sid");
  return sid && sid.length > 0 ? sid : randomUUID();
}

function getRequestContext(request: IncomingMessage) {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);
  const origin = request.headers.origin ?? "";
  const token = url.searchParams.get("token") ?? "";
  const ipHeader = request.headers["x-forwarded-for"];
  const ip = Array.isArray(ipHeader)
    ? ipHeader[0]
    : (ipHeader ?? request.socket.remoteAddress ?? "").toString().split(",")[0].trim();
  const userAgent = request.headers["user-agent"] ?? "";

  return { url, origin, token, ip, userAgent };
}

function isOriginAllowed(origin: string) {
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function createSession(id: string): Session {
  const geminiWs = new WebSocket(GEMINI_URL);
  const session: Session = {
    id,
    geminiWs,
    clientWs: null,
    recordingBuffer: [],
    recordingBytes: 0,
    disconnectTimer: null,
    maxDurationTimer: null,
    lastClientInfo: null,
    closed: false,
  };

  console.log(`👤 新規セッション開始: ${id}`);
  session.maxDurationTimer = setTimeout(() => {
    if (session.closed) return;
    cleanupSession(session, "max-duration");
  }, MAX_SESSION_MS);

  geminiWs.on("open", () => {
    geminiWs.send(JSON.stringify(initialSetupMessage));
    geminiWs.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: systemPrompt }] }],
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

  clientWs.on("message", (data: any) => {
    handleClientMessage(session, data);
  });

  clientWs.on("close", () => {
    session.clientWs = null;
    console.log(`🔌 切断: ${session.id}`);
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
      generateScore(session.recordingBuffer).then((feedback) => {
        if (feedback && session.clientWs?.readyState === WebSocket.OPEN) {
          session.clientWs.send(JSON.stringify({ type: "FEEDBACK_RESULT", data: feedback }));
        }
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

function cleanupSession(session: Session, reason: string) {
  if (session.closed === false) {
    session.closed = true;
  }
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
async function generateScore(audioBuffer: Buffer[]) {
  try {
    if (audioBuffer.length === 0) return null;

    const fullAudio = Buffer.concat(audioBuffer);
    const wavBuffer = addWavHeader(fullAudio, 24000, 1, 16);
    const base64Audio = wavBuffer.toString("base64");

    // ★ここを変更: 5つの指標をJSONスキーマに追加
    const prompt = `
あなたはベテラン面接官です。以下の音声は「模擬面接の録音データ」です。
この候補者のパフォーマンスを評価し、以下のJSON形式で出力してください。
**必ず日本語で出力すること。**

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
