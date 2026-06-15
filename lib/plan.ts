/**
 * プラン定義（フロント・バックエンド共通）
 *
 * 収益モデル: フリーミアムSaaS
 * - free   : 1日15分まで無料（集客・体験用）
 * - premium: 月額 ¥980 で1日120分まで（実質無制限の練習量）
 *
 * 損益分岐: premium 32人 ≒ 月¥31,360（Stripe手数料3.6%差引後 約¥30,230）
 */

export type PlanId = "free" | "premium";

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "フリー",
  premium: "プレミアム",
};

/** 月額（円） */
export const PREMIUM_PRICE_JPY = 980;

/** 1日あたりの利用上限（秒） */
export const FREE_DAILY_LIMIT_SECONDS = 15 * 60; // 900
export const PREMIUM_DAILY_LIMIT_SECONDS = 120 * 60; // 7200

export function dailyLimitSecondsFor(plan: PlanId): number {
  return plan === "premium"
    ? PREMIUM_DAILY_LIMIT_SECONDS
    : FREE_DAILY_LIMIT_SECONDS;
}

/** subscriptions.status のうち、プレミアムとして扱うもの */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;
