import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { createClient } from "../../lib/supabase/server";
import { getUserPlan } from "../../lib/subscription";
import { PREMIUM_PRICE_JPY } from "../../lib/plan";
import { withTimeout } from "../../lib/withTimeout";
import PricingActions from "./PricingActions";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = createClient();
  // 認証基盤が無応答でも料金ページは必ず表示する
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), 3000, {
    data: { user: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

  const plan = user
    ? await withTimeout(getUserPlan(supabase, user.id), 3000, "free" as const)
    : "free";

  const freeFeatures = [
    "1日15分まで面接練習",
    "面接の種類・難易度を選択",
    "5段階評価・レーダーチャート",
    "履歴の保存",
  ];
  const premiumFeatures = [
    "応募先企業・職種に合わせた面接",
    "あなたのES・自己PRを読んで深掘り",
    "1日120分まで（実質無制限）",
    "5段階評価・レーダーチャート",
    "弱点の継続トラッキング",
    "いつでも解約可能",
  ];

  return (
    <main className="min-h-screen px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center animate-rise">
          <Link href="/" className="text-sm font-semibold text-muted transition hover:text-ink">
            ← TOPに戻る
          </Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-700">
            Pricing
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
            本番に合わせて、<span className="gradient-text">本気で仕上げる</span>。
          </h1>
          <p className="mt-3 text-sm text-muted">
            無料で試して、納得したらプレミアムへ。いつでも解約できます。
          </p>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="card card-hover p-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">Free</p>
            <p className="mt-3 text-4xl font-black text-ink">¥0</p>
            <p className="mt-1 text-xs text-muted">まずはお試し</p>
            <ul className="mt-6 space-y-3 text-sm text-ink/80">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-full bg-slate-100 py-3 text-center text-sm font-bold text-muted">
              {plan === "free" ? "現在のプラン" : "ダウングレード可"}
            </div>
          </div>

          {/* Premium */}
          <div className="relative overflow-hidden rounded-3xl p-[1.5px] shadow-halo-lg [background-image:var(--brand-grad)]">
            <span className="absolute right-5 top-5 z-10 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              おすすめ
            </span>
            <div className="relative rounded-[calc(1.5rem-1.5px)] bg-white p-8">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-700">Premium</p>
              <p className="mt-3 text-4xl font-black text-ink">
                ¥{PREMIUM_PRICE_JPY.toLocaleString()}
                <span className="text-base font-bold text-muted">/月</span>
              </p>
              <p className="mt-1 text-xs text-muted">いつでも解約OK</p>
              <ul className="mt-6 space-y-3 text-sm text-ink/90">
                {premiumFeatures.map((f, i) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span className={i < 2 ? "font-semibold" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <PricingActions plan={plan} loggedIn={Boolean(user)} />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 text-center text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          決済は Stripe により安全に処理されます。カード情報は当サービスに保存されません。
        </div>
      </div>
    </main>
  );
}
