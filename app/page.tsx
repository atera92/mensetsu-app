import Link from "next/link";
import { createClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.75),_rgba(246,241,234,0.85))]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 lg:py-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-emerald-900/20">
              <span className="text-lg font-semibold font-[var(--font-display)]">面</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--muted)]">
                Mensetsu Studio
              </p>
              <p className="text-lg font-semibold">面接練習のための集中空間</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <nav className="hidden items-center gap-4 md:flex">
              <Link className="text-[var(--muted)] transition hover:text-[var(--ink)]" href="/interview">
                面接を始める
              </Link>
              <Link className="text-[var(--muted)] transition hover:text-[var(--ink)]" href="/mypage">
                マイページ
              </Link>
              <Link className="font-semibold text-[var(--accent)] transition hover:opacity-80" href="/pricing">
                料金プラン
              </Link>
            </nav>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--muted)] shadow-sm">
                  ログイン中: {user.email ?? user.id}
                </span>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200/70 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            ) : (
              <Link
                className="rounded-full border border-emerald-200/70 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                href="/login"
              >
                ログイン
              </Link>
            )}
          </div>
        </header>

        <section className="mt-14 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8 opacity-0 animate-[rise_0.8s_ease-out_forwards]">
            <p className="text-xs uppercase tracking-[0.5em] text-[var(--accent)]">Interview Simulation</p>
            <h1 className="text-4xl font-semibold leading-tight text-[var(--ink)] md:text-5xl lg:text-6xl font-[var(--font-display)]">
              本番の緊張感を、<br className="hidden md:block" />
              いつもの練習に。
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
              声の温度、回答の深さ、エピソードの具体性。採点とフィードバックで、
              自分の弱点を明確にしながら改善できます。
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/interview"
                className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
              >
                面接を始める
              </Link>
              <Link
                href="/mypage"
                className="rounded-full border border-[var(--ink)]/20 bg-white/80 px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5"
              >
                これまでの記録を見る
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                1日15分までの集中トレーニング
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                フィードバックは即時保存
              </div>
            </div>
          </div>

          <div
            className="relative opacity-0 animate-[rise_0.9s_ease-out_forwards]"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Today</p>
                  <p className="text-2xl font-semibold text-[var(--ink)]">集中トレーニング</p>
                </div>
                <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Ready
                </span>
              </div>

              <div className="mt-8 space-y-5">
                {[
                  { label: "声の大きさ", value: "安定", color: "bg-emerald-500" },
                  { label: "回答の深さ", value: "要深掘り", color: "bg-amber-500" },
                  { label: "エピソード", value: "明確", color: "bg-slate-600" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="font-semibold text-[var(--ink)]">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-dashed border-emerald-200/70 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                今日の面接は「自己PR」を深掘りする設計です。<br />1問ずつ丁寧に進めましょう。
              </div>
            </div>

            <div className="absolute -right-6 -top-6 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--muted)] shadow-lg">
              再接続対応
            </div>

            <div className="absolute -bottom-8 left-10 h-24 w-24 rounded-3xl bg-[var(--accent-2)]/70 blur-2xl" />
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "一貫性を磨く",
              body: "回答の矛盾を減らし、説得力のあるストーリーを構築。",
            },
            {
              title: "弱点の可視化",
              body: "採点指標で、改善すべきポイントを明確に。",
            },
            {
              title: "再現性の確認",
              body: "同様の成果を再現できる条件を言語化。",
            },
          ].map((card, index) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/70 bg-white/70 p-6 text-sm text-[var(--muted)] shadow-lg shadow-slate-900/5 opacity-0 animate-[rise_0.8s_ease-out_forwards]"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <h3 className="text-lg font-semibold text-[var(--ink)]">{card.title}</h3>
              <p className="mt-2 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div
            className="space-y-6 opacity-0 animate-[rise_0.9s_ease-out_forwards]"
            style={{ animationDelay: "0.4s" }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">Process</p>
            <h2 className="text-3xl font-semibold text-[var(--ink)] font-[var(--font-display)]">
              面接の流れを設計する
            </h2>
            <ol className="space-y-4 text-sm text-[var(--muted)]">
              {[
                "テーマを決めて面接を開始",
                "深掘り質問で本質を確認",
                "採点とフィードバックで改善",
              ].map((step, idx) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ink)]/20 bg-white text-xs font-semibold text-[var(--ink)]">
                    0{idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="rounded-[28px] border border-[var(--ink)]/10 bg-[var(--ink)] p-8 text-white shadow-2xl opacity-0 animate-[rise_0.9s_ease-out_forwards]"
            style={{ animationDelay: "0.5s" }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Insight</p>
            <h3 className="mt-3 text-2xl font-semibold font-[var(--font-display)]">
              「なぜ」を深掘りすることで、<br />
              思考の芯が見えてくる。
            </h3>
            <p className="mt-4 text-sm text-white/70">
              あなたの言葉を要約し、矛盾や曖昧さがあればその場で静かに指摘します。
            </p>
            <div className="mt-6 grid gap-4 text-xs text-white/60">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span>深掘り回数</span>
                <span className="text-white">最大3回</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span>集中時間</span>
                <span className="text-white">15分/日</span>
              </div>
              <div className="flex items-center justify-between">
                <span>保存</span>
                <span className="text-white">即時保存</span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="mt-20 rounded-[32px] border border-white/70 bg-white/70 px-8 py-10 text-center shadow-xl opacity-0 animate-[rise_0.9s_ease-out_forwards]"
          style={{ animationDelay: "0.6s" }}
        >
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">Ready</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)] font-[var(--font-display)]">
            次の面接を、ここで磨く
          </h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            深掘りとフィードバックで、あなたの言葉に芯を通します。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/interview"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5"
            >
              面接を始める
            </Link>
            <Link
              href="/mypage"
              className="rounded-full border border-[var(--accent)]/40 bg-white px-6 py-3 text-sm font-semibold text-[var(--accent)] transition hover:-translate-y-0.5"
            >
              マイページを見る
            </Link>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <span>© 2025 Mensetsu Studio</span>
          <div className="flex items-center gap-4">
            <span>集中と記録に特化した面接練習</span>
            <span className="hidden sm:inline">/</span>
            <span>再接続・安全設計</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
