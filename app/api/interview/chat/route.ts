import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getUserPlan } from "../../../../lib/subscription";
import { buildInterviewPrompt } from "../../../../lib/interview";
import {
  dailyLimitFor,
  elapsedSecondsSince,
  getDailyUsageSeconds,
  getDateKey,
  getOrCreateSetup,
  MAX_SESSION_SECONDS,
} from "../../../../lib/interviewServer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";
/** 会話の暴走防止（1セッションの最大往復数） */
const MAX_TURNS = 60;

type ChatMessage = { role: "user" | "model"; text: string };

/**
 * 会話モード面接：ユーザーの回答を受け取り、AI面接官の次の発話を返す。
 * 音声サーバー不要で、Verceだけで完結して動く面接の中核。
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI面接はただいま準備中です（APIキー未設定）。" },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { sessionId?: string; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const sessionId = (body.sessionId ?? "").trim();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  if (messages.length > MAX_TURNS * 2) {
    return NextResponse.json(
      { error: "セッションが長すぎます。面接を終了して採点してください。" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const plan = await getUserPlan(admin, user.id);
  const isPremium = plan === "premium";

  // 利用制限（音声サーバーと同じルール：日次上限 + セッション15分）
  const setup = await getOrCreateSetup(admin, user.id, sessionId);
  const elapsed = elapsedSecondsSince(setup.createdAt);
  const used = await getDailyUsageSeconds(admin, user.id, getDateKey());
  if (used + elapsed >= dailyLimitFor(plan)) {
    return NextResponse.json({ error: "daily limit reached" }, { status: 403 });
  }
  if (elapsed >= MAX_SESSION_SECONDS) {
    return NextResponse.json({ error: "session expired" }, { status: 403 });
  }

  const systemPrompt =
    buildInterviewPrompt(setup, isPremium) +
    "\n【重要】これは音声ではなくテキスト/読み上げの対話です。1回の発話は3文以内で簡潔に。マークダウンや箇条書きは使わず、話し言葉のみで返答してください。";

  // 履歴が空＝面接開始。最初の質問を促すユーザーターンを補う
  const contents = (
    messages.length > 0
      ? messages
      : [{ role: "user" as const, text: "面接を開始してください。挨拶と最初の質問をお願いします。" }]
  ).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: String(m.text ?? "").slice(0, 4000) }],
  }));

  // 先頭はuserロールである必要があるため保証する
  if (contents[0]?.role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "（面接を続けてください）" }] });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: CHAT_MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent({
      contents,
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
    });
    const reply = result.response.text().trim();
    if (!reply) throw new Error("empty reply");

    const remainingSeconds = Math.max(
      0,
      Math.min(dailyLimitFor(plan) - used, MAX_SESSION_SECONDS) - elapsed
    );
    return NextResponse.json({ reply, remainingSeconds });
  } catch (e) {
    console.error("interview chat error:", e);
    return NextResponse.json(
      { error: "AI面接官の応答に失敗しました。もう一度お試しください。" },
      { status: 502 }
    );
  }
}
