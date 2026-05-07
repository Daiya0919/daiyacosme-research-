import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban-board";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  // 集計
  const skuCount = await prisma.sKU.count();
  const awardCount = await prisma.award.count();
  const resultCount = await prisma.awardResult.count();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DaiyaCosme総合ランキング</h1>
          <p className="text-sm text-zinc-500 mt-1">
            8アワード × 5年分の受賞SKUを再編集し、独自の表彰軸で並べました。商品企画・OEM・投資判断に直接使える形で構造化しています。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">SKU {skuCount} / アワード {awardCount} / 受賞 {resultCount}</span>
          <Link href="/research"><Button variant="outline" size="sm">リサーチ実行</Button></Link>
          <Link href="/admin"><Button size="sm">データ管理</Button></Link>
        </div>
      </section>

      <KanbanBoard rankings={rankings as any} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <Link href="/category" className="rounded-xl border bg-white p-4 hover:border-rose-200">
          <div className="text-sm font-semibold">カテゴリ別ランキング</div>
          <div className="text-xs text-zinc-500 mt-1">化粧水 / 美容液 / リップ ... 17カテゴリ</div>
        </Link>
        <Link href="/research" className="rounded-xl border bg-white p-4 hover:border-rose-200">
          <div className="text-sm font-semibold">リサーチ実行</div>
          <div className="text-xs text-zinc-500 mt-1">年度・アワード・カテゴリ・キーワードを指定して収集</div>
        </Link>
        <Link href="/admin" className="rounded-xl border bg-white p-4 hover:border-rose-200">
          <div className="text-sm font-semibold">データ管理 / CSV出力</div>
          <div className="text-xs text-zinc-500 mt-1">表記揺れ統合・要確認データ・4種CSV</div>
        </Link>
      </section>
    </div>
  );
}
