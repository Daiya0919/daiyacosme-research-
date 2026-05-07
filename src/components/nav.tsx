import Link from "next/link";
import { Sparkles } from "lucide-react";

const NAV = [
  { href: "/", label: "総合カンバン" },
  { href: "/category", label: "カテゴリ別" },
  { href: "/research", label: "リサーチ実行" },
  { href: "/admin", label: "データ管理" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rose-500" />
          <span className="font-semibold tracking-tight">DaiyaCosme Research</span>
          <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">Award再編集 × OEM示唆</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-1.5 text-sm rounded-md hover:bg-zinc-100">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
