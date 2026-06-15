import type { Metadata } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const bodyFont = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const displayFont = Shippori_Mincho_B1({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mensetsu Studio｜AI面接官と話す面接練習アプリ",
    template: "%s｜Mensetsu Studio",
  },
  description:
    "AI面接官が音声で深掘り質問し、5段階評価とレーダーチャートで採点。就活・転職の面接対策を、本番の緊張感のまま自宅で練習できます。1日15分まで無料。",
  keywords: [
    "面接練習",
    "面接対策",
    "AI面接",
    "模擬面接",
    "就活",
    "転職",
    "自己PR",
    "ガクチカ",
    "逆質問",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Mensetsu Studio",
    title: "Mensetsu Studio｜AI面接官と話す面接練習アプリ",
    description:
      "AI面接官が音声で深掘り。5段階評価とレーダーチャートで弱点を可視化。1日15分まで無料。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
