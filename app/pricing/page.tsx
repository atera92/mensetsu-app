import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { getUserPlan } from "../../lib/subscription";
import { PREMIUM_PRICE_JPY } from "../../lib/plan";
import PricingActions from "./PricingActions";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plan = user ? await getUserPlan(supabase, user.id) : "free";

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
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <Link href="/" className="text-sm font-bold text-slate-400 hover:text-emerald-600">
            ← TOPに戻る
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-800">料金プラン</h1>
          <p className="mt-2 text-sm text-slate-500">
            本気の面接対策に、練習量の上限を外す。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold tracking-widest text-slate-400">FREE</p>
            <p className="mt-2 text-4xl font-black text-slate-800">¥0</p>
            <p className="text-xs text-slate-400">まずはお試し</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-lg bg-slate-100 py-3 text-center text-sm font-bold text-slate-500">
              {plan === "free" ? "現在のプラン" : "ダウングレード可"}
            </div>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-emerald-500 bg-white p-8 shadow-lg">
            <span className="absolute -top-3 left-8 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
              おすすめ
            </span>
            <p className="text-sm font-bold tracking-widest text-emerald-600">PREMIUM</p>
            <p className="mt-2 text-4xl font-black text-slate-800">
              ¥{PREMIUM_PRICE_JPY.toLocaleString()}
              <span className="text-base font-bold text-slate-400">/月</span>
            </p>
            <p className="text-xs text-slate-400">いつでも解約OK</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PricingActions plan={plan} loggedIn={Boolean(user)} />
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          決済は Stripe により安全に処理されます。カード情報が当サービスに保存されることはありません。
        </p>
      </div>
    </main>
  );
}
