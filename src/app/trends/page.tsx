import { prisma } from "@/lib/prisma";
import { TrendCharts } from "./charts";

export const dynamic = "force-dynamic";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const currentYear = new Date().getFullYear();
  const fromYear = parseInt(searchParams.from ?? String(currentYear - 4));
  const toYear   = parseInt(searchParams.to   ?? String(currentYear));

  // 年度別 × アワード別 受賞件数
  const awardResults = await prisma.awardResult.findMany({
    where: { year: { gte: fromYear, lte: toYear } },
    include: { award: true, sku: { include: { brand: true, category: true } } },
  });

  // 年度別集計
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

  const byYear = years.map((year) => {
    const rows = awardResults.filter((r) => r.year === year);
    const koreanCount = rows.filter((r) => r.sku.brand.isKorean).length;
    return {
      year: String(year),
      total: rows.length,
      korean: koreanCount,
      domestic: rows.length - koreanCount,
    };
  });

  // カテゴリ別受賞件数TOP10
  const categoryMap = new Map<string, number>();
  for (const r of awardResults) {
    const cat = r.sku.category.name;
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const byCategory = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // アワード別受賞件数
  const awardMap = new Map<string, number>();
  for (const r of awardResults) {
    awardMap.set(r.award.name, (awardMap.get(r.award.name) ?? 0) + 1);
  }
  const byAward = Array.from(awardMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name: shortName(name), count }));

  // 年度別 韓国コスメ比率
  const koreanRatio = byYear.map((d) => ({
    year: d.year,
    ratio: d.total > 0 ? Math.round((d.korean / d.total) * 100) : 0,
  }));

  // 総計
  const totalResults  = awardResults.length;
  const uniqueSkus    = new Set(awardResults.map((r) => r.skuId)).size;
  const uniqueBrands  = new Set(awardResults.map((r) => r.sku.brand.name)).size;
  const koreanTotal   = awardResults.filter((r) => r.sku.brand.isKorean).length;

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="border-b border-navy-100 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">Trend Intelligence</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">トレンド分析</h1>
            <p className="text-sm text-navy-500 mt-1">年度別・期間別の受賞傾向を可視化。アワード横断のマクロトレンドを把握できます。</p>
          </div>
          {/* 期間セレクタ */}
          <form method="GET" className="flex items-center gap-2 text-sm">
            <label className="text-navy-500 text-xs">期間</label>
            <select name="from" defaultValue={fromYear}
              className="rounded border border-navy-200 bg-white px-2 py-1 text-xs text-navy-800 focus:outline-none">
              {[2021,2022,2023,2024,2025].map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <span className="text-navy-400">〜</span>
            <select name="to" defaultValue={toYear}
              className="rounded border border-navy-200 bg-white px-2 py-1 text-xs text-navy-800 focus:outline-none">
              {[2021,2022,2023,2024,2025].map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <button type="submit" className="rounded bg-navy-900 px-3 py-1 text-xs font-medium text-white hover:bg-navy-800 transition-colors">
              適用
            </button>
          </form>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "受賞件数",     value: totalResults.toLocaleString() },
          { label: "対象SKU",      value: uniqueSkus.toLocaleString() },
          { label: "ブランド数",   value: uniqueBrands.toLocaleString() },
          { label: "韓国コスメ",   value: `${totalResults > 0 ? Math.round((koreanTotal / totalResults) * 100) : 0}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-navy-100 bg-white px-4 py-3 shadow-card">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">{label}</div>
            <div className="text-xl font-bold tabular-nums text-navy-900">{value}</div>
            <div className="text-[10px] text-navy-300">{fromYear}–{toYear}年</div>
          </div>
        ))}
      </div>

      {/* チャート群 */}
      <TrendCharts
        byYear={byYear}
        byCategory={byCategory}
        byAward={byAward}
        koreanRatio={koreanRatio}
      />
    </div>
  );
}

function shortName(name: string) {
  return name.replace("ベストコスメアワード", "").replace("ベストコスメ", "").replace("アワード", "").trim().slice(0, 15);
}
