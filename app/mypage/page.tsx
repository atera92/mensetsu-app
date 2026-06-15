import { Suspense } from "react";
import Link from "next/link";
import MypageClient from "./MypageClient";
import { createClient } from "../../lib/supabase/server";
import { getUserPlan } from "../../lib/subscription";
import { PLAN_LABEL } from "../../lib/plan";

export const dynamic = "force-dynamic";

async function PlanBanner() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const plan = await getUserPlan(supabase, user.id);
  const isPremium = plan === "premium";

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6 md:px-12">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
          isPremium
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isPremium ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
            }`}
          >
            {PLAN_LABEL[plan]}プラン
          </span>
          <span className="text-sm text-slate-500">
            {isPremium ? "1日120分まで利用できます" : "1日15分まで（無料）"}
          </span>
        </div>
        <Link
          href="/pricing"
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            isPremium
              ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
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
