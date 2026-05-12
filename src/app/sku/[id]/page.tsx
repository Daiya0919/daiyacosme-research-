import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { ScoreChart } from "@/components/score-chart";
import { AwardTimeline } from "@/components/timeline";
import { yen, asList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SkuDetail({ params }: { params: { id: string } }) {
  const sku = await prisma.sKU.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      category: true,
      awardResults: { include: { award: true, sources: true }, orderBy: [{ year: "desc" }] },
      analyses: { orderBy: { generatedAt: "desc" }, take: 1 },
      similarFrom: { include: { to: { include: { brand: true, category: true } } } },
      rankings: true,
    },
  });
  if (!sku) return notFound();
  const analysis = sku.analyses[0];

  // 出典URLをユニーク化
  const allSources = sku.awardResults.flatMap((r) => r.sources);
  const sources = Array.from(new Map(allSources.map((s) => [s.url, s])).values());
  const ingredients = asList(sku.ingredients);
  const skinConcerns = asList(sku.skinConcerns);
  const skinTones = asList(sku.skinTones);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {sku.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sku.imageUrl} alt={sku.name} className="w-24 h-24 rounded-lg object-cover bg-zinc-100 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">{sku.brand.name} / {sku.category.name}</div>
            <h1 className="text-2xl font-bold mt-1">{sku.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant={sku.trendOrClassic === "trend" ? "trend" : sku.trendOrClassic === "classic" ? "classic" : sku.trendOrClassic === "both" ? "both" : "secondary"}>
                {sku.trendOrClassic === "trend" ? "トレンド"
                  : sku.trendOrClassic === "classic" ? "定番"
                  : sku.trendOrClassic === "both" ? "両立"
                  : "判定不能"}
              </Badge>
              <Badge variant="secondary">{yen(sku.price)}</Badge>
              {sku.volume && <Badge variant="secondary">{sku.volume}</Badge>}
              {sku.launchYear && <Badge variant="secondary">発売 {sku.launchYear}年</Badge>}
              {sku.brand.isKorean && <Badge variant="info">韓国コスメ</Badge>}
              {sku.brand.isPrestige && <Badge variant="info">プレステージ</Badge>}
              {sku.needsReview && <Badge variant="warn">要確認</Badge>}
            </div>
            {sku.manufacturerName && (
              <div className="mt-2 text-sm">
                <span className="text-zinc-500">製造販売元: </span>
                {sku.manufacturerUrl ? (
                  <a
                    href={sku.manufacturerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium text-zinc-800 hover:underline"
                  >
                    {sku.manufacturerName}
                  </a>
                ) : (
                  <span className="font-medium text-zinc-800">{sku.manufacturerName}</span>
                )}
              </div>
            )}
            {sku.productUrl && (
              <a
                href={sku.productUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-rose-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                販売ページを開く
              </a>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold text-rose-600">{Math.round(sku.totalScore)}</div>
          <div className="text-xs text-zinc-500">TOTAL SCORE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>受賞履歴タイムライン</CardTitle>
          </CardHeader>
          <CardContent>
            <AwardTimeline items={sku.awardResults as any} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>スコア内訳</CardTitle></CardHeader>
          <CardContent>
            <ScoreChart scores={sku} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>なぜ売れているのか</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis?.whySelling ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>どんな人に合うか</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis?.whoFits ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>商品開発上の示唆</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis?.developmentHint ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>市場の空白領域</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis?.marketGap ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>成分特徴</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {ingredients.length === 0 && <span className="text-sm text-zinc-500">—</span>}
            {ingredients.map((i) => <Badge key={i} variant="secondary">{i}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>対応する肌悩み</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {skinConcerns.length === 0 && <span className="text-sm text-zinc-500">—</span>}
            {skinConcerns.map((i) => <Badge key={i} variant="info">{i}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>対応する肌カラー</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {skinTones.length === 0 && <span className="text-sm text-zinc-500">—</span>}
            {skinTones.map((i) => <Badge key={i}>{i}</Badge>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>類似SKU</CardTitle></CardHeader>
        <CardContent>
          {sku.similarFrom.length === 0 && <span className="text-sm text-zinc-500">—</span>}
          <div className="flex flex-wrap gap-2">
            {sku.similarFrom.map((sim) => (
              <Link key={sim.id} href={`/sku/${sim.to.id}`} className="rounded-lg border px-3 py-2 hover:border-rose-200 text-sm">
                <div className="font-medium">{sim.to.name}</div>
                <div className="text-xs text-zinc-500">{sim.to.brand.name} · {sim.to.category.name}</div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>出典URL一覧</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <Badge variant={s.reliability >= 0.7 ? "info" : "warn"}>信頼度 {Math.round(s.reliability * 100)}</Badge>
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="hover:underline break-all">
                  {s.title || s.url}
                </a>
              </li>
            ))}
            {sources.length === 0 && <span className="text-zinc-500">出典なし</span>}
          </ul>
        </CardContent>
      </Card>

      <div>
        <Link href="/"><Button variant="outline">← カンバンに戻る</Button></Link>
      </div>
    </div>
  );
}
