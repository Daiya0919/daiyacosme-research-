import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "ダイヤ総研_日本コスメアワード評価レポート",
  description: "化粧品アワードを再編集し、商品企画・OEM・ブランド投資判断に使うリサーチSaaS。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Nav />
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
