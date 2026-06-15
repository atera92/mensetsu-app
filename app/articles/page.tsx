import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "../../lib/articles";

export const metadata: Metadata = {
  title: "面接対策コラム",
  description:
    "自己PR・逆質問・ガクチカ・頻出質問など、面接対策に役立つコラム。読んだその場でAI面接官相手に練習できます。",
  alternates: { canonical: "/articles" },
};

export default function ArticlesIndex() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-slate-400 hover:text-emerald-600">
          ← TOPに戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-800">面接対策コラム</h1>
        <p className="mt-2 text-sm text-slate-500">
          読んだ内容は、AI面接官相手にその場で練習できます。
        </p>

        <div className="mt-10 space-y-4">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/articles/${a.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-300 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-slate-800">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{a.description}</p>
              <span className="mt-3 inline-block text-sm font-bold text-emerald-600">
                続きを読む →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-[var(--ink,#0f172a)] p-8 text-center text-white">
          <h2 className="text-xl font-bold">読んだら、その場で練習。</h2>
          <p className="mt-2 text-sm text-white/70">
            AI面接官が音声で深掘り。1日15分まで無料です。
          </p>
          <Link
            href="/interview"
            className="mt-5 inline-block rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            面接を始める
          </Link>
        </div>
      </div>
    </main>
  );
}
