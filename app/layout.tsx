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

export const metadata: Metadata = {
  title: "Interview App",
  description: "Simple Interview App",
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
