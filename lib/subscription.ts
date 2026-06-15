import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_SUBSCRIPTION_STATUSES, type PlanId } from "./plan";

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

/**
 * 渡された Supabase クライアントで、ユーザーの現在の有効プランを判定する。
 * - status が active / trialing
 * - かつ current_period_end が未来（または未設定）
 * を満たすときだけ premium とみなす。それ以外は free。
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanId> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle<SubscriptionRow>();

  if (error || !data) return "free";
  return isPremiumRow(data) ? "premium" : "free";
}

export function isPremiumRow(row: SubscriptionRow): boolean {
  const status = (row.status ?? "").toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(status as never)) return false;

  if (row.current_period_end) {
    const end = new Date(row.current_period_end).getTime();
    if (Number.isFinite(end) && end < Date.now()) return false;
  }
  return row.plan === "premium";
}
