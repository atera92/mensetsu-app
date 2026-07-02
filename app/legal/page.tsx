import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "Mensetsu Studio の特定商取引法に基づく表記です。",
  alternates: { canonical: "/legal" },
};

/**
 * ⚠️ 販売者情報はサービス運営者本人の情報に書き換えてください。
 * 「（請求があった場合...）」の記載は、個人事業主がデジタルサービスを
 * 販売する場合に消費者庁ガイドラインで認められている省略表記です。
 */
const rows: { label: string; value: string }[] = [
  {
    label: "販売事業者",
    value: "Mensetsu Studio 運営者（個人）",
  },
  {
    label: "運営責任者",
    value: "請求があった場合に遅滞なく開示します",
  },
  {
    label: "所在地",
    value: "請求があった場合に遅滞なく開示します",
  },
  {
    label: "電話番号",
    value: "請求があった場合に遅滞なく開示します（お問い合わせは下記メールにて承ります）",
  },
  {
    label: "メールアドレス",
    value: "yamatozaitsu@gmail.com",
  },
  {
    label: "販売価格",
    value: "プレミアムプラン：月額980円（税込）。詳細は料金ページをご確認ください。",
  },
  {
    label: "販売価格以外でお客様に発生する金銭",
    value: "インターネット接続料金・通信料金はお客様のご負担となります。",
  },
  {
    label: "支払方法",
    value: "クレジットカード決済（Stripe）",
  },
  {
    label: "支払時期",
    value: "初回はお申し込み時、以降は毎月の更新日に自動決済されます。",
  },
  {
    label: "サービスの提供時期",
    value: "決済完了後、直ちにご利用いただけます。",
  },
  {
    label: "解約・キャンセル",
    value:
      "マイページのカスタマーポータルからいつでも解約できます。解約後も当該課金期間の末日までご利用可能です。日割りでの返金は行いません。",
  },
  {
    label: "返品・返金",
    value:
      "デジタルサービスの性質上、決済完了後の返金は原則お受けできません。サービスに重大な不具合がある場合は個別に対応いたしますので、メールにてご連絡ください。",
  },
  {
    label: "動作環境",
    value:
      "マイクを利用できる最新のブラウザ（Chrome推奨）。音声通信が可能なネットワーク環境が必要です。",
  },
];

export default function LegalPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-muted transition hover:text-ink">
          ← TOPに戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-ink">特定商取引法に基づく表記</h1>
        <p className="mt-2 text-xs text-muted">最終改定日: 2026年7月2日</p>

        <div className="card mt-8 overflow-hidden p-0">
          <dl>
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid gap-1 px-6 py-4 sm:grid-cols-[220px_1fr] sm:gap-4 ${
                  i !== rows.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <dt className="text-sm font-bold text-ink">{row.label}</dt>
                <dd className="m-0 text-sm leading-relaxed text-ink/80">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-brand-700">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
        </div>
      </div>
    </main>
  );
}
