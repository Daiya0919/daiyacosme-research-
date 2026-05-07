import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingTable } from "@/components/ranking-table";

export const dynamic = "force-dynamic";

export default async function CategoryPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  const skus = await prisma.sKU.findMany({
    include: {
      brand: true,
      category: true,
      awardResults: true,
    },
    orderBy: { totalScore: "desc" },
  });
  const byCategory = new Map<string, typeof skus>();
  for (const c of categories) byCategory.set(c.id, [] as any);
  for (const s of skus) byCategory.get(s.categoryId)?.push(s);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">カテゴリ別ランキング</h1>
        <p className="text-sm text-zinc-500 mt-1">17カテゴリでスコア順に並び替え。プチプラ / デパコス / 韓国コスメも横軸で見られます。</p>
      </div>
      <Tabs defaultValue={categories[0]?.id ?? ""}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
          ))}
        </TabsList>
        {categories.map((c) => {
          const list = byCategory.get(c.id) ?? [];
          const rows = list.map((s) => ({
            id: s.id,
            name: s.name,
            brand: s.brand.name,
            category: s.category.name,
            price: s.price,
            totalScore: s.totalScore,
            trendOrClassic: s.trendOrClassic,
            awardCount: s.awardResults.length,
          }));
          return (
            <TabsContent key={c.id} value={c.id}>
              {rows.length ? <RankingTable rows={rows} /> : <p className="text-sm text-zinc-500 py-6 text-center">このカテゴリにはまだデータがありません。</p>}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
