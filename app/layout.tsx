import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "./components/AppShell";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Mood & Meds App",
  description: "Track your daily mood and medication logs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={nunito.className}>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#FAF7F2" }}>
        {/* 全ページ共通のシェル構造を適用 */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
