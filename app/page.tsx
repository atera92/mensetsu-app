import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  Mic,
  Radar,
  Sparkles,
  Target,
} from "lucide-react";
import { createClient } from "../lib/supabase/server";
import { withTimeout } from "../lib/withTimeout";

export default async function Home() {
  const supabase = createClient();
  // 認証基盤が無応答でもトップページは必ず表示する（3秒で未ログイン扱い）
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), 3000, {
    data: { user: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:py-10">
        {/* ヘッダー */}
        <header className="glass sticky top-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-full px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold text-white shadow-glow [background-image:var(--brand-grad)] font-display">
              面
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand-700">
                Mensetsu Studio
              </p>
              <p className="text-sm font-bold text-ink">AI面接練習</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-4">
            <nav className="hidden items-center gap-5 md:flex">
              <Link className="font-semibold text-muted transition hover:text-ink" href="/interview">
                面接を始める
              </Link>
              <Link className="font-semibold text-muted transition hover:text-ink" href="/articles">
                面接対策コラム
              </Link>
              <Link className="font-semibold text-muted transition hover:text-ink" href="/mypage">
                マイページ
              </Link>
              <Link className="font-semibold text-brand-700 transition hover:text-brand-strong" href="/pricing">
                料金プラン
              </Link>
            </nav>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="chip hidden sm:inline-flex">{user.email ?? user.id}</span>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="btn-ghost px-5 py-2 text-xs">
                ログイン
              </Link>
            )}
          </div>
        </header>

        {/* ヒーロー */}
        <section className="mt-16 grid items-center gap-12 lg:mt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8 animate-rise">
            <div className="chip">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              AI面接官 × 音声リアルタイム深掘り
            </div>
            <h1 className="text-4xl font-bold leading-[1.15] text-ink md:text-5xl lg:text-6xl font-display">
              本番の緊張感を、
              <br />
              <span className="gradient-text">いつもの練習</span>に。
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted">
              AI面接官があなたの回答を音声で深掘り。声の温度、回答の深さ、エピソードの具体性を
              採点とフィードバックで可視化し、弱点を明確にしながら改善できます。
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/interview" className="btn-primary">
                <Mic className="h-4 w-4" />
                無料で面接を始める
              </Link>
              <Link href="/pricing" className="btn-ghost">
                料金プランを見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
              {["登録は数秒（Google）", "1日15分まで無料", "履歴・採点は即時保存"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand-600" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ヒーロー右：ライブ感のあるモックカード */}
          <div className="relative animate-rise" style={{ animationDelay: "0.12s" }}>
            <div className="glass rounded-4xl p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">
                    Live Session
                  </p>
                  <p className="mt-1 text-xl font-bold text-ink">AI面接官と対話中</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                  </span>
                  REC
                </span>
              </div>

              <div className="mt-6 flex items-end justify-center gap-1.5 rounded-2xl bg-brand-50/70 px-6 py-7">
                {[14, 26, 40, 30, 48, 34, 22, 42, 28, 16, 36, 24].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-brand-500/80"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              <div className="mt-6 space-y-3.5">
                {[
                  { label: "声の大きさ", value: "安定", tone: "text-brand-700 bg-brand-50" },
                  { label: "回答の深さ", value: "要深掘り", tone: "text-amber-700 bg-amber-50" },
                  { label: "エピソード", value: "明確", tone: "text-slate-700 bg-slate-100" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{item.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-sm leading-relaxed text-brand-800">
                「その成果について、あなた自身の判断が影響した部分を具体的に教えてください」
              </div>
            </div>

            <div className="chip absolute -right-3 -top-3 shadow-halo">再接続対応</div>
          </div>
        </section>

        {/* 特長 */}
        <section className="mt-24 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: <AudioLines className="h-5 w-5 text-brand-600" />,
              title: "音声でリアルタイム深掘り",
              body: "テキストではなく“声”で回答。本番同様の緊張感の中で、AIが「なぜ？」「具体的には？」を重ねます。",
            },
            {
              icon: <Radar className="h-5 w-5 text-brand-600" />,
              title: "5指標のレーダー採点",
              body: "声の大きさ・応答の質・企業マッチ度・エピソード・明瞭さを可視化。弱点が一目でわかります。",
            },
            {
              icon: <Target className="h-5 w-5 text-brand-600" />,
              title: "あなた専用の面接官",
              body: "応募先の企業・職種、あなたのESを読み込み、本番さながらの質問で仕上げる（プレミアム）。",
            },
          ].map((card, index) => (
            <div
              key={card.title}
              className="card card-hover p-6 animate-rise"
              style={{ animationDelay: `${0.15 + index * 0.08}s` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                {card.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
            </div>
          ))}
        </section>

        {/* 流れ */}
        <section className="mt-24 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6 animate-rise" style={{ animationDelay: "0.2s" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-700">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-ink font-display">
              3ステップで、今日から仕上がる
            </h2>
            <ol className="space-y-4 text-sm text-muted">
              {[
                "面接の種類と面接官のトーンを選ぶ（プレミアムは企業・ES連携）",
                "AI面接官と音声で対話。深掘り質問で本質を確認",
                "採点とフィードバックで改善点を明確化。履歴で成長を追う",
              ].map((step, idx) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    0{idx + 1}
                  </span>
                  <span className="pt-1.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-strong">
              <BookOpen className="h-4 w-4" />
              面接対策コラムを読む
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div
            className="relative overflow-hidden rounded-4xl p-8 text-white shadow-halo-lg animate-rise [background-image:var(--brand-grad)]"
            style={{ animationDelay: "0.28s" }}
          >
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/70">
              Insight
            </p>
            <h3 className="mt-3 text-2xl font-bold leading-snug font-display">
              「なぜ」を深掘りすることで、
              <br />
              思考の芯が見えてくる。
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              あなたの言葉を要約し、矛盾や曖昧さがあればその場で静かに指摘。
              暗記した答えでは通らない“本番の対話”を再現します。
            </p>
            <div className="mt-7 grid gap-3 text-xs text-white/75">
              {[
                ["深掘り回数", "1問につき最大3回"],
                ["練習時間", "無料15分/日・プレミアム120分/日"],
                ["フィードバック", "終了後すぐ・自動保存"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-white/15 pb-3 last:border-0 last:pb-0">
                  <span>{k}</span>
                  <span className="font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 最終CTA */}
        <section
          className="card mt-24 px-8 py-12 text-center animate-rise"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-700">
            Ready
          </p>
          <h2 className="mt-3 text-3xl font-bold text-ink font-display">
            次の面接を、<span className="gradient-text">ここで磨く</span>。
          </h2>
          <p className="mt-3 text-sm text-muted">
            深掘りとフィードバックで、あなたの言葉に芯を通します。まずは無料で。
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/interview" className="btn-primary">
              <Mic className="h-4 w-4" />
              面接を始める
            </Link>
            <Link href="/pricing" className="btn-ghost">
              プレミアムを見る
            </Link>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 pb-4 text-xs text-muted">
          <span>© 2026 Mensetsu Studio</span>
          <div className="flex items-center gap-4">
            <Link href="/articles" className="transition hover:text-ink">面接対策コラム</Link>
            <Link href="/pricing" className="transition hover:text-ink">料金プラン</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
