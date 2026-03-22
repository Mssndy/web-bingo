import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AdSlot from "@/components/ui/AdSlot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ビンゴ！",
  description: "子供向けビンゴ抽選サービス。計算ビンゴにも対応！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col items-center bg-[var(--color-bingo-bg)]">
        <AdSlot slotId="bingo-top" width={320} height={50} className="w-full max-w-lg" />
        <div className="flex-1 w-full max-w-lg">
          {children}
        </div>
        <AdSlot slotId="bingo-bottom" width={320} height={50} className="w-full max-w-lg" />
      </body>
    </html>
  );
}
