import { Fragment } from "react";

/**
 * 記事本文（段落配列）を簡易レンダリングする。
 * "## " 見出し / "- " 箇条書き（連続分はまとめて <ul>）/ それ以外は段落。
 */
export default function ArticleBody({ body }: { body: string[] }) {
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="my-4 space-y-2 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  body.forEach((line, idx) => {
    if (line.startsWith("## ")) {
      flushBullets(`ul-${idx}`);
      blocks.push(
        <h2 key={idx} className="mt-8 mb-3 text-xl font-bold text-slate-800">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets(`ul-${idx}`);
      blocks.push(
        <p key={idx} className="my-4 leading-relaxed text-slate-700">
          {line}
        </p>
      );
    }
  });
  flushBullets("ul-end");

  return <Fragment>{blocks}</Fragment>;
}
