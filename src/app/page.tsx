import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban-board";
import Link from "next/link";
import { BarChart2, Database, FlaskConical, TrendingUp, Award, Package, Star, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rankings = await prisma.daiyaCosmeRanking.findMany({
    orderBy: [{ daiyaCosmeAwardType: "asc" }, { rank: "asc" }],
    include: {
      sku: {
        include: {
          brand: true,
          category: true,
          awardResults: { include: { award: true } },
        },
      },
    },
  });

  const [skuCount, awardCount, resultCount, brandCount, koreanCount, lastResult] = await Promise.all([
    prisma.sKU.count(),
    prisma.award.count(),
    prisma.awardResult.count(),
    prisma.brand.count(),
    prisma.brand.count({ where: { isKorean: true } }),
    prisma.awardResult.findFirst({ orderBy: { year: "desc" } }),
  ]);

  const latestYear = lastResult?.year ?? 2025;

  const STATS = [
    { label: "分析SKU",    value: skuCount.toLocaleString(),   icon: Package,  sub: "受賞商品" },
    { label: "アワード",  value: awardCount.toString(),        icon: Award,    sub: "8媒体" },
    { label: "受賞実績",  value: resultCount.toLocaleString(), icon: Star,     sub: "件" },
    { label: "ブランド",  value: brandCount.toLocaleString(),  icon: BarChart2, sub: `内 韓国系 ${koreanCount}` },
    { label: "データ年度", value: `2021–${latestYear}`,        icon: Calendar,  sub: "5年分" },
  ];

  const QUICK = [
    { href: "/category", icon: BarChart2,     title: "カテゴリ分析",    desc: "28カテゴリ別スコア比較・ランキング" },
    { href: "/trends",   icon: TrendingUp,    title: "トレンド分析",    desc: "年度・期間別の受賞傾向推移を可視化" },
    { href: "/research", icon: FlaskConical,  title: "リサーチ実行",    desc: "年度・アワード・キーワード指定で収集" },
    { href: "/admin",    icon: Database,      title: "データ管理",      desc: "SKU編集・重複統合・4種CSV出力" },
  ];

  return (
    <div className="space-y-8">

      {/* ヘッダー */}
      <div className="border-b border-navy-100 pb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">DaiyaCosme Research · Market Intelligence</p>
            <h1 className="text-2xl font-bold text-navy-900">総合受賞SKUダッシュボード</h1>
            <p className="text-sm text-navy-500 mt-1.5 max-w-xl">
              8大美容アワード × 5年分の受賞データを構造化し、独自スコアで再編集。商品企画・OEM・投資判断に直結するリサーチデータ。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/research" className="inline-flex items-center gap-1.5 rounded border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50 transition-colors">
              <FlaskConical className="h-3.5 w-3.5" />リサーチ実行
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1.5 rounded bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 transition-colors">
              <Database className="h-3.5 w-3.5" />データ管理
            </Link>
          </div>
        </div>
      </div>

      {/* KPI ストリップ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATS.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-lg border border-navy-100 bg-white px-4 py-3 shadow-card">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="h-3.5 w-3.5 text-navy-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-400">{label}</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-navy-900">{value}</div>
            <div className="text-[11px] text-navy-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* クイックナビ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="group rounded-lg border border-navy-100 bg-white p-4 hover:border-navy-300 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-navy-50 group-hover:bg-navy-100 transition-colors">
                <Icon className="h-4 w-4 text-navy-600" />
              </span>
              <span className="text-sm font-semibold text-navy-800">{title}</span>
            </div>
            <p className="text-xs text-navy-400 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      {/* カンバン */}
      <div>
        <p className="section-title">DaiyaCosme 10大賞 · TOP 8</p>
        <KanbanBoard rankings={rankings as any} />
      </div>

    </div>
  );
}
