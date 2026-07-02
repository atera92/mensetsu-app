import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Mensetsu Studio の利用規約です。",
  alternates: { canonical: "/terms" },
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "第1条（適用）",
    body: [
      "本規約は、Mensetsu Studio（以下「本サービス」）の提供条件および本サービスの利用に関する運営者とユーザーとの間の権利義務関係を定めるものです。ユーザーは、本規約に同意のうえ本サービスを利用するものとします。",
    ],
  },
  {
    heading: "第2条（アカウント）",
    body: [
      "本サービスの利用にはGoogleアカウント等による認証が必要です。ユーザーは自己の責任でアカウントを管理し、第三者に利用させてはなりません。",
      "アカウントの不正利用により生じた損害について、運営者は故意または重過失がある場合を除き責任を負いません。",
    ],
  },
  {
    heading: "第3条（本サービスの内容）",
    body: [
      "本サービスは、AIを用いた模擬面接・採点・フィードバック等を提供するものです。面接の質問・評価・アドバイスはAIによる自動生成であり、その正確性・有用性・特定の採用選考での結果を保証するものではありません。",
    ],
  },
  {
    heading: "第4条（料金および支払方法）",
    body: [
      "有料プランの料金は料金ページに表示するとおりとし、決済はStripe社の決済システムを通じて行われます。",
      "有料プランは月額課金であり、解約手続きを行わない限り自動更新されます。ユーザーはいつでもカスタマーポータルから解約でき、解約後も当該課金期間の末日まで有料機能を利用できます。",
      "日割り精算および支払済み料金の返金は、法令に定めがある場合を除き行いません。",
    ],
  },
  {
    heading: "第5条（禁止事項）",
    body: [
      "ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。",
      "・法令または公序良俗に違反する行為",
      "・本サービスのサーバー等に過度の負荷をかける行為、リバースエンジニアリング等の解析行為",
      "・アカウントの共有・譲渡・貸与",
      "・AIに対する不適切な入力等、本サービスの運営を妨害する行為",
      "・その他、運営者が不適切と合理的に判断する行為",
    ],
  },
  {
    heading: "第6条（利用制限・登録抹消）",
    body: [
      "運営者は、ユーザーが本規約に違反した場合、事前の通知なく、本サービスの全部もしくは一部の利用を制限し、またはアカウントを削除できるものとします。",
    ],
  },
  {
    heading: "第7条（サービスの変更・中断・終了）",
    body: [
      "運営者は、ユーザーへの事前告知のうえ（緊急の場合は事後）、本サービスの内容の変更、提供の中断または終了を行うことができます。これによりユーザーに生じた損害について、運営者は故意または重過失がある場合を除き責任を負いません。",
    ],
  },
  {
    heading: "第8条（知的財産権）",
    body: [
      "本サービスに関する知的財産権は運営者または正当な権利者に帰属します。ユーザーが本サービスに入力したコンテンツ（ES・回答音声等）の権利はユーザーに帰属しますが、運営者はサービス提供・品質向上の目的で必要な範囲でこれを利用できるものとします。",
    ],
  },
  {
    heading: "第9条（免責）",
    body: [
      "運営者は、本サービスに事実上または法律上の瑕疵がないことを保証しません。",
      "運営者がユーザーに対して負う損害賠償責任は、債務不履行・不法行為その他請求原因を問わず、当該ユーザーが過去12か月間に運営者に支払った利用料金の総額を上限とします（運営者に故意または重過失がある場合を除く）。",
    ],
  },
  {
    heading: "第10条（規約の変更）",
    body: [
      "運営者は、必要と判断した場合、本規約を変更できます。重要な変更を行う場合は、本サービス上での掲示等の適切な方法で周知します。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。",
    ],
  },
  {
    heading: "第11条（準拠法・管轄）",
    body: [
      "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、運営者の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-muted transition hover:text-ink">
          ← TOPに戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-ink">利用規約</h1>
        <p className="mt-2 text-xs text-muted">最終改定日: 2026年7月2日</p>

        <div className="card mt-8 space-y-8 p-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold text-ink">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-ink/80">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-brand-700">
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
          <Link href="/legal" className="hover:underline">特定商取引法に基づく表記</Link>
        </div>
      </div>
    </main>
  );
}
