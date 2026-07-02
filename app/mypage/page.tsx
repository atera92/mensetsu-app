import { Suspense } from "react";
import Link from "next/link";
import MypageClient from "./MypageClient";
import { createClient } from "../../lib/supabase/server";
import { getUserPlan } from "../../lib/subscription";
import { PLAN_LABEL } from "../../lib/plan";
import { withTimeout } from "../../lib/withTimeout";

export const dynamic = "force-dynamic";

async function PlanBanner() {
  const supabase = createClient();
  // 認証基盤が無応答でもマイページを止めない
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), 3000, {
    data: { user: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  if (!user) return null;

  const plan = await withTimeout(getUserPlan(supabase, user.id), 3000, "free" as const);
  const isPremium = plan === "premium";

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6 md:px-12">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 shadow-halo ${
          isPremium
            ? "border-brand-200 bg-brand-50"
            : "border-line bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isPremium
                ? "text-white [background-image:var(--brand-grad)]"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {PLAN_LABEL[plan]}プラン
          </span>
          <span className="text-sm text-muted">
            {isPremium ? "1日120分まで利用できます" : "1日15分まで（無料）"}
          </span>
        </div>
        <Link
          href="/pricing"
          className={isPremium ? "btn-ghost px-4 py-2 text-sm" : "btn-primary px-4 py-2 text-sm"}
        >
          {isPremium ? "プランを管理" : "プレミアムにアップグレード"}
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">読み込み中...</div>}>
      <PlanBanner />
      <MypageClient />
    </Suspense>
  );
}
