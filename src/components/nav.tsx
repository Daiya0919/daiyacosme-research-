"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Database, FlaskConical, LayoutDashboard, TrendingUp } from "lucide-react";

const NAV = [
  { href: "/",         label: "ダッシュボード",   icon: LayoutDashboard },
  { href: "/category", label: "カテゴリ分析",     icon: BarChart2 },
  { href: "/trends",   label: "トレンド分析",     icon: TrendingUp },
  { href: "/research", label: "リサーチ実行",     icon: FlaskConical },
  { href: "/admin",    label: "データ管理",       icon: Database },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-navy-900 text-white shadow-lg">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-amber-500 text-navy-950 font-black text-xs">DC</span>
          <span className="font-semibold tracking-tight text-sm hidden sm:block">ダイヤ総研</span>
          <span className="text-[10px] text-navy-300 hidden md:block font-mono">| 日本コスメアワード評価レポート</span>
        </Link>
        <nav className="flex items-center">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  active
                    ? "bg-navy-700 text-white"
                    : "text-navy-300 hover:text-white hover:bg-navy-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
