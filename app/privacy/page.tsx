import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Mensetsu Studio のプライバシーポリシーです。",
  alternates: { canonical: "/privacy" },
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "1. 取得する情報",
    body: [
      "・アカウント情報：メールアドレス、認証プロバイダ（Google）から提供される識別子",
      "・面接練習データ：面接中の音声（採点処理のため）、採点結果・フィードバック・練習履歴",
      "・面接設定情報：ユーザーが入力した応募先企業名・職種・ES等の応募書類（プレミアム機能）",
      "・利用状況：1日あたりの利用時間、端末識別子（不正利用防止のため）、アクセスログ",
      "・決済情報：決済はStripe社が処理し、カード番号等が当サービスのサーバーに保存されることはありません。",
    ],
  },
  {
    heading: "2. 利用目的",
    body: [
      "・本サービス（模擬面接・採点・フィードバック・履歴管理）の提供",
      "・有料プランの課金管理、本人確認、不正利用の防止",
      "・サービスの品質向上、不具合対応、お問い合わせ対応",
      "・法令に基づく対応",
    ],
  },
  {
    heading: "3. 外部サービスへの提供",
    body: [
      "本サービスは、提供に必要な範囲で以下の外部サービスへ情報を送信します。",
      "・Supabase（認証・データベース）：アカウント情報、練習履歴等の保存",
      "・Google Gemini API（AI処理）：面接中の音声および面接設定（採点・対話生成のため）",
      "・Stripe（決済）：課金に必要な情報",
      "・Vercel（ホスティング）：アクセスログ等",
      "上記を除き、法令に基づく場合を除いて、本人の同意なく第三者に個人情報を提供しません。",
    ],
  },
  {
    heading: "4. 音声データの取り扱い",
    body: [
      "面接中の音声は採点・フィードバック生成のために一時的に処理されます。採点処理後、音声データはサーバーに恒久保存されません（採点結果のテキストのみ履歴として保存されます）。",
    ],
  },
  {
    heading: "5. 安全管理",
    body: [
      "通信はTLSにより暗号化されます。データベースへのアクセスは行レベルセキュリティ（RLS）により本人のみに制限されています。",
    ],
  },
  {
    heading: "6. 開示・訂正・削除",
    body: [
      "ユーザーは、自己の個人情報の開示・訂正・利用停止・削除を求めることができます。アカウントの削除をご希望の場合は、下記の連絡先までお問い合わせください。",
    ],
  },
  {
    heading: "7. Cookie等の利用",
    body: [
      "本サービスは、ログイン状態の維持および不正利用防止のためにCookieおよびローカルストレージを利用します。",
    ],
  },
  {
    heading: "8. 改定",
    body: [
      "本ポリシーの内容は、法令の改正やサービス内容の変更に応じて改定されることがあります。重要な変更はサービス上で周知します。",
    ],
  },
  {
    heading: "9. お問い合わせ",
    body: [
      "本ポリシーに関するお問い合わせは、特定商取引法に基づく表記に記載の連絡先までお願いします。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-muted transition hover:text-ink">
          ← TOPに戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-ink">プライバシーポリシー</h1>
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
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/legal" className="hover:underline">特定商取引法に基づく表記</Link>
        </div>
      </div>
    </main>
  );
}
