import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ARTICLES, getArticle, getAllSlugs } from "../../../lib/articles";
import ArticleBody from "../ArticleBody";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const article = getArticle(params.slug);
  if (!article) return { title: "記事が見つかりません" };
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
    },
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ja",
  };

  return (
    <main className="min-h-screen px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <Link
          href="/articles"
          className="flex items-center text-sm font-bold text-slate-400 hover:text-emerald-600"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> コラム一覧へ
        </Link>

        <h1 className="mt-4 text-3xl font-bold leading-snug text-slate-900">
          {article.title}
        </h1>
        <p className="mt-3 text-xs text-slate-400">更新日: {article.updatedAt}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
          <ArticleBody body={article.body} />
        </div>

        {/* 本文末のCTA（集客→体験への転換点） */}
        <div className="mt-8 rounded-2xl bg-emerald-50 p-8 text-center">
          <h2 className="text-lg font-bold text-emerald-900">
            読んだ内容を、AI面接官で試そう
          </h2>
          <p className="mt-2 text-sm text-emerald-800/80">
            音声で深掘りされて初めて、答えの穴が見えます。1日15分まで無料。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/interview"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              面接を始める
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              料金プランを見る
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-slate-700">関連コラム</h2>
            <div className="space-y-3">
              {related.map((a) => (
                <Link
                  key={a.slug}
                  href={`/articles/${a.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition hover:border-emerald-300"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
