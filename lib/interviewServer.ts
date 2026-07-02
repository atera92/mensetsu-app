/**
 * 会話モード面接のサーバー側共通処理。
 * Vercelのみで完結する面接を実現するため、利用制限・面接設定の読み書きを
 * APIルートから使える形でまとめる（音声サーバー server.ts と同じルールを適用）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FREE_DAILY_LIMIT_SECONDS,
  PREMIUM_DAILY_LIMIT_SECONDS,
  type PlanId,
} from "./plan";
import type { InterviewSetup } from "./interview";

/** 1セッションの上限（音声サーバーと同じ15分） */
export const MAX_SESSION_SECONDS = 15 * 60;

export function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dailyLimitFor(plan: PlanId) {
  return plan === "premium" ? PREMIUM_DAILY_LIMIT_SECONDS : FREE_DAILY_LIMIT_SECONDS;
}

export async function getDailyUsageSeconds(
  admin: SupabaseClient,
  userId: string,
  dateKey: string
): Promise<number> {
  const { data, error } = await admin
    .from("daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle();
  if (error) {
    console.error("daily_usage lookup error:", error.message);
    // 取得失敗時は上限扱い（安全側）
    return Number.MAX_SAFE_INTEGER;
  }
  return data?.seconds_used ?? 0;
}

export async function addDailyUsageSeconds(
  admin: SupabaseClient,
  userId: string,
  dateKey: string,
  secondsToAdd: number
) {
  if (secondsToAdd <= 0) return;
  const { data, error } = await admin
    .from("daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle();
  if (error) {
    console.error("daily_usage read error:", error.message);
    return;
  }
  const next = (data?.seconds_used ?? 0) + secondsToAdd;
  if (data) {
    const { error: e } = await admin
      .from("daily_usage")
      .update({ seconds_used: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("date", dateKey);
    if (e) console.error("daily_usage update error:", e.message);
  } else {
    const { error: e } = await admin.from("daily_usage").insert({
      user_id: userId,
      date: dateKey,
      seconds_used: next,
      updated_at: new Date().toISOString(),
    });
    if (e) console.error("daily_usage insert error:", e.message);
  }
}

export type SetupRow = InterviewSetup & { createdAt: string };

/**
 * セッションの面接設定を取得。無ければ作成して開始時刻を確定させる
 * （created_at がセッション経過時間の基準になる）。
 */
export async function getOrCreateSetup(
  admin: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<SetupRow> {
  const { data } = await admin
    .from("interview_setups")
    .select("scenario, difficulty, company, role, focus, material, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      scenario: (data.scenario ?? "general") as SetupRow["scenario"],
      difficulty: (data.difficulty ?? "normal") as SetupRow["difficulty"],
      company: data.company ?? undefined,
      role: data.role ?? undefined,
      focus: data.focus ?? undefined,
      material: data.material ?? undefined,
      createdAt: data.created_at,
    };
  }

  const now = new Date().toISOString();
  await admin.from("interview_setups").insert({
    user_id: userId,
    session_id: sessionId,
    scenario: "general",
    difficulty: "normal",
    created_at: now,
  });
  return { scenario: "general", difficulty: "normal", createdAt: now };
}

/** セッション開始からの経過秒（セッション上限でキャップ） */
export function elapsedSecondsSince(createdAt: string): number {
  const start = new Date(createdAt).getTime();
  if (!Number.isFinite(start)) return 0;
  const elapsed = Math.floor((Date.now() - start) / 1000);
  return Math.max(0, Math.min(elapsed, MAX_SESSION_SECONDS));
}
