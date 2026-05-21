import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findDuplicateCandidatesAction } from "../actions";
import { AdminActions } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const skus = await prisma.sKU.findMany({
    include: { brand: true, category: true, awardResults: true },
    orderBy: { totalScore: "desc" },
  });
  const awards = await prisma.award.findMany({ include: { _count: { select: { results: true, sources: true } } } });
  const sources = await prisma.source.findMany({ orderBy: { fetchedAt: "desc" }, take: 50, include: { award: true } });
  const dupes = await findDuplicateCandidatesAction(0.85);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">データ管理</h1>
          <p className="text-sm text-zinc-500 mt-1">SKU・アワード・出典の確認、表記揺れ統合、CSVエクスポート。</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/csv/sku_master" className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">sku_master.csv</a>
          <a href="/api/csv/award_results" className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">award_results.csv</a>
          <a href="/api/csv/daiyacosme_rankings" className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">daiyacosme_rankings.csv</a>
          <a href="/api/csv/raw_sources" className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">raw_sources.csv</a>
        </div>
      </div>

      <AdminActions />

      <Tabs defaultValue="sku">
        <TabsList>
          <TabsTrigger value="sku">SKU一覧 ({skus.length})</TabsTrigger>
          <TabsTrigger value="awards">アワード ({awards.length})</TabsTrigger>
          <TabsTrigger value="sources">出典 ({sources.length})</TabsTrigger>
          <TabsTrigger value="dupes">重複候補 ({dupes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sku">
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-navy-400 text-xs bg-navy-50">
                  <tr className="border-b border-navy-100">
                    <th className="text-left py-2 px-3">SKU</th>
                    <th className="text-left py-2 px-3">ブランド</th>
                    <th className="text-left py-2 px-3">カテゴリ</th>
                    <th className="text-left py-2 px-3 max-w-[240px]">キャッチコピー</th>
                    <th className="text-right py-2 px-3">価格</th>
                    <th className="text-center py-2 px-3">医薬</th>
                    <th className="text-right py-2 px-3">受賞</th>
                    <th className="text-right py-2 px-3">スコア</th>
                    <th className="text-left py-2 px-3">判定</th>
                    <th className="text-left py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {skus.map((s) => (
                    <tr key={s.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                      <td className="py-2 px-3 max-w-[180px]">
                        <a className="font-medium text-navy-900 hover:text-amber-600 hover:underline transition-colors line-clamp-1" href={`/sku/${s.id}`}>{s.name}</a>
                        {s.needsReview && <Badge variant="warn" className="ml-1">要確認</Badge>}
                      </td>
                      <td className="py-2 px-3 text-xs text-navy-500 whitespace-nowrap">{s.brand.name}</td>
                      <td className="py-2 px-3 text-xs text-navy-500 whitespace-nowrap">{s.category.name}</td>
                      <td className="py-2 px-3 max-w-[240px]">
                        {s.catchCopy
                          ? <span className="text-xs text-navy-600 line-clamp-2 leading-relaxed">{s.catchCopy}</span>
                          : <span className="text-xs text-navy-200">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-mono tabular-nums text-navy-700 whitespace-nowrap">
                        {s.price ? `¥${s.price.toLocaleString()}` : <span className="text-navy-200">—</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {s.isQuasiDrug && <span className="text-[10px] bg-purple-100 text-purple-700 rounded px-1 py-0.5 font-semibold">医薬</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-xs tabular-nums text-navy-600">{s.awardResults.length}</td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-amber-600">{Math.round(s.totalScore)}</td>
                      <td className="py-2 px-3 text-xs text-navy-400">{s.trendOrClassic}</td>
                      <td className="py-2 px-3"><a href={`/sku/${s.id}`} className="text-xs text-amber-600 hover:underline font-medium">詳細</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awards">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead className="text-zinc-500 text-xs">
                  <tr className="border-b">
                    <th className="text-left p-2">アワード</th>
                    <th className="text-left p-2">slug</th>
                    <th className="text-left p-2">媒体タイプ</th>
                    <th className="text-right p-2">重み</th>
                    <th className="text-right p-2">受賞数</th>
                    <th className="text-right p-2">出典数</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-2 font-medium">{a.name}</td>
                      <td className="p-2 text-xs text-zinc-500">{a.slug}</td>
                      <td className="p-2">{a.mediaType}</td>
                      <td className="p-2 text-right">{a.weight}</td>
                      <td className="p-2 text-right">{a._count.results}</td>
                      <td className="p-2 text-right">{a._count.sources}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardContent className="pt-4">
              <ul className="space-y-1 text-sm">
                {sources.map((s) => (
                  <li key={s.id} className="border-b py-2 flex items-start gap-2">
                    <Badge variant={s.reliability >= 0.7 ? "info" : "warn"}>信頼度{Math.round(s.reliability * 100)}</Badge>
                    <Badge variant="secondary">{s.award?.name ?? "—"} {s.year ?? ""}</Badge>
                    <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1 min-w-0">
                      {s.title || s.url}
                    </a>
                    {s.needsReview && <Badge variant="warn">要確認</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dupes">
          <Card>
            <CardHeader><CardTitle>重複候補（normalizedName類似度0.85以上）</CardTitle></CardHeader>
            <CardContent>
              {dupes.length === 0 && <p className="text-sm text-zinc-500">候補なし。</p>}
              <ul className="space-y-2">
                {dupes.map((d, i) => (
                  <li key={i} className="rounded-md border p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{d.a.name}</div>
                      <div className="text-zinc-500 text-xs">vs. {d.b.name}</div>
                    </div>
                    <Badge variant="warn">類似度 {d.score}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
