import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getUserPlan } from "../../../../lib/subscription";
import { buildJudgeContext } from "../../../../lib/interview";
import {
  addDailyUsageSeconds,
  elapsedSecondsSince,
  getDateKey,
  getOrCreateSetup,
} from "../../../../lib/interviewServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JUDGE_MODEL = process.env.GEMINI_JUDGE_MODEL || "gemini-2.5-flash";

type ChatMessage = { role: "user" | "model"; text: string };

/**
 * 会話モード面接の終了処理：利用時間を記録し、対話ログから採点する。
 * 採点スキーマは音声サーバー(server.ts)と同一（レーダーチャート互換）。
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキー未設定" }, { status: 503 });
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
  const messages = (Array.isArray(body.messages) ? body.messages : []).slice(0, 200);
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const plan = await getUserPlan(admin, user.id);
  const setup = await getOrCreateSetup(admin, user.id, sessionId);

  // 利用時間を確定（セッション開始からの経過。サーバー基準で改ざん不可）
  const elapsed = elapsedSecondsSince(setup.createdAt);
  await addDailyUsageSeconds(admin, user.id, getDateKey(), elapsed);

  const userAnswers = messages.filter((m) => m.role === "user");
  if (userAnswers.length === 0) {
    return NextResponse.json({ feedback: null });
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "候補者" : "面接官"}: ${String(m.text ?? "").slice(0, 2000)}`)
    .join("\n");
  const judgeContext = buildJudgeContext(setup, plan === "premium");

  const prompt = `
あなたはベテラン面接官です。以下は模擬面接の対話ログです。
候補者のパフォーマンスを評価し、以下のJSON形式のみで出力してください。
**必ず日本語で出力すること。**
${judgeContext ? `\n面接の前提: ${judgeContext}\n「会社とのマッチ度(company_match)」はこの前提への適合度として評価してください。\n` : ""}
{
  "score": 0〜100の整数,
  "metrics": {
    "voice_volume": 1〜5の整数 (回答の積極性・発話量として評価),
    "response_quality": 1〜5の整数 (適切な応答),
    "company_match": 1〜5の整数 (会社とのマッチ度),
    "episodes": 1〜5の整数 (エピソードの具体性),
    "clarity": 1〜5の整数 (わかりやすさ)
  },
  "good_points": "評価できる点（1行）",
  "advice": "改善すべき点（辛口で1行）",
  "comment": "総評（1行）"
}

--- 対話ログ ---
${transcript}
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: JUDGE_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    return NextResponse.json({ feedback });
  } catch (e) {
    console.error("interview judge error:", e);
    return NextResponse.json(
      { error: "採点に失敗しました。", feedback: null },
      { status: 502 }
    );
  }
}
