import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft, Sun, Thermometer, Factory, Pill, Palette } from "lucide-react";
import { ScoreChart } from "@/components/score-chart";
import { AwardTimeline } from "@/components/timeline";
import { yen, asList } from "@/lib/utils";

export const dynamic = "force-dynamic";

const seasonLabel: Record<string, string> = { summer: "夏に売れる", winter: "冬に売れる", both: "通年" };

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-0.5">{label}</dt>
      <dd className={`text-sm text-navy-900 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

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
  const allSources = sku.awardResults.flatMap((r) => r.sources);
  const sources = Array.from(new Map(allSources.map((s) => [s.url, s])).values());
  const ingredients = asList(sku.ingredients);
  const effects = asList(sku.effects ?? "[]");
  const skinConcerns = asList(sku.skinConcerns);
  const skinTones = asList(sku.skinTones);
  const colorVariations = asList(sku.colorVariations ?? "[]");

  return (
    <div className="space-y-6 max-w-5xl">

      {/* パンくず */}
      <div className="flex items-center gap-2 text-xs text-navy-400">
        <Link href="/" className="hover:text-navy-700 transition-colors">ダッシュボード</Link>
        <span>/</span>
        <span className="text-navy-700">{sku.name}</span>
      </div>

      {/* ヘッダーカード */}
      <div className="rounded-lg border border-navy-100 bg-white shadow-card p-6">
        <div className="flex items-start gap-6 flex-wrap">
          {/* 画像 */}
          <div className="shrink-0 w-28 h-28 rounded-lg border border-navy-100 bg-navy-50 overflow-hidden flex items-center justify-center">
            {sku.imageUrl
              ? <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover" />
              : <span className="text-xs text-navy-300 font-mono">NO IMG</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">
              {sku.brand.name} · {sku.category.name}
            </div>
            <h1 className="text-xl font-bold text-navy-900">{sku.name}</h1>
            {sku.nameKorean && (
              <div className="text-sm text-navy-500 mt-0.5">{sku.nameKorean}</div>
            )}
            {sku.catchCopy && (
              <p className="mt-2 text-sm text-navy-600 italic border-l-2 border-amber-400 pl-3">{sku.catchCopy}</p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant={sku.trendOrClassic === "trend" ? "trend" : sku.trendOrClassic === "classic" ? "classic" : sku.trendOrClassic === "both" ? "both" : "secondary"}>
                {sku.trendOrClassic === "trend" ? "トレンド" : sku.trendOrClassic === "classic" ? "定番" : sku.trendOrClassic === "both" ? "両立" : "判定不能"}
              </Badge>
              {sku.isQuasiDrug && <Badge className="bg-purple-100 text-purple-700 border-purple-200"><Pill className="h-3 w-3 mr-1" />医薬部外品</Badge>}
              {sku.price && <Badge variant="secondary">{yen(sku.price)}</Badge>}
              {sku.volume && <Badge variant="secondary">{sku.volume}</Badge>}
              {sku.launchYear && <Badge variant="secondary">発売 {sku.launchYear}年</Badge>}
              {sku.brand.isKorean && <Badge variant="info">韓国コスメ</Badge>}
              {sku.brand.isPrestige && <Badge variant="info">プレステージ</Badge>}
              {sku.season && <Badge variant="secondary"><Thermometer className="h-3 w-3 mr-1" />{seasonLabel[sku.season] ?? sku.season}</Badge>}
              {(sku.spf || sku.pa) && (
                <Badge variant="secondary"><Sun className="h-3 w-3 mr-1" />{sku.spf ? `SPF${sku.spf}` : ""}{sku.pa ? ` ${sku.pa}` : ""}</Badge>
              )}
              {sku.needsReview && <Badge variant="warn">要確認</Badge>}
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {sku.manufacturerName && (
                <div>
                  <span className="text-navy-400">製造販売元: </span>
                  {sku.manufacturerUrl
                    ? <a href={sku.manufacturerUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-navy-800 hover:underline">{sku.manufacturerName}</a>
                    : <span className="font-medium text-navy-800">{sku.manufacturerName}</span>}
                </div>
              )}
              {sku.countryOfManufacture && (
                <div><span className="text-navy-400">製造国: </span><span className="font-medium text-navy-800">{sku.countryOfManufacture}</span></div>
              )}
            </div>

            {sku.factoryName && (
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <Factory className="h-3.5 w-3.5 text-navy-400" />
                <span className="text-navy-400">製造工場: </span>
                <span className="font-medium text-navy-800">{sku.factoryName}</span>
              </div>
            )}

            {sku.productUrl && (
              <a href={sku.productUrl} target="_blank" rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-amber-600 hover:underline font-medium">
                <ExternalLink className="h-4 w-4" />販売ページを開く
              </a>
            )}
          </div>

          {/* スコア */}
          <div className="shrink-0 text-center border-l border-navy-100 pl-6">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">TOTAL SCORE</div>
            <div className="text-4xl font-bold tabular-nums text-amber-500">{Math.round(sku.totalScore)}</div>
            <div className="text-xs text-navy-400 mt-0.5">/ 100</div>
            {sku.lastCrawledAt && (
              <div className="mt-3 text-[10px] text-navy-300">
                最終取得<br />{new Date(sku.lastCrawledAt).toLocaleDateString("ja-JP")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2カラム: 受賞タイムライン + スコアレーダー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">受賞履歴タイムライン</p>
          <AwardTimeline items={sku.awardResults as any} />
        </div>
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">スコア内訳</p>
          <ScoreChart scores={sku} />
        </div>
      </div>

      {/* 成分・効果効能・カラー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ingredients.length > 0 && (
          <div className="rounded-lg border border-navy-100 bg-white shadow-card p-4">
            <p className="section-title">成分特徴</p>
            <div className="flex flex-wrap gap-1">
              {ingredients.map((i) => <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>)}
            </div>
          </div>
        )}
        {effects.length > 0 && (
          <div className="rounded-lg border border-navy-100 bg-white shadow-card p-4">
            <p className="section-title">効果効能</p>
            <div className="flex flex-wrap gap-1">
              {effects.map((i) => <Badge key={i} variant="info" className="text-[10px]">{i}</Badge>)}
            </div>
          </div>
        )}
        {skinConcerns.length > 0 && (
          <div className="rounded-lg border border-navy-100 bg-white shadow-card p-4">
            <p className="section-title">対応する肌悩み</p>
            <div className="flex flex-wrap gap-1">
              {skinConcerns.map((i) => <Badge key={i} variant="info" className="text-[10px]">{i}</Badge>)}
            </div>
          </div>
        )}
        {(colorVariations.length > 0 || skinTones.length > 0) && (
          <div className="rounded-lg border border-navy-100 bg-white shadow-card p-4">
            <p className="section-title"><Palette className="h-3 w-3 inline mr-1" />カラー展開 · 肌カラー</p>
            <div className="flex flex-wrap gap-1">
              {colorVariations.map((c) => <Badge key={c} className="text-[10px] bg-pink-50 text-pink-700 border-pink-200">{c}</Badge>)}
              {skinTones.map((i) => <Badge key={i} className="text-[10px]">{i}</Badge>)}
            </div>
          </div>
        )}
      </div>

      {/* AI分析 */}
      {analysis && (
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">AI分析レポート</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: "なぜ売れているのか", body: analysis.whySelling },
              { label: "どんな人に合うか",   body: analysis.whoFits },
              { label: "商品開発上の示唆",   body: analysis.developmentHint },
              { label: "市場の空白領域",     body: analysis.marketGap },
            ].map(({ label, body }) => body ? (
              <div key={label}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">{label}</div>
                <p className="text-sm text-navy-700 leading-relaxed">{body}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* 類似SKU */}
      {sku.similarFrom.length > 0 && (
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">類似SKU</p>
          <div className="flex flex-wrap gap-2">
            {sku.similarFrom.map((sim) => (
              <Link key={sim.id} href={`/sku/${sim.to.id}`}
                className="rounded-lg border border-navy-100 px-3 py-2 hover:border-navy-300 hover:shadow-card-hover transition-all text-sm">
                <div className="font-medium text-navy-800">{sim.to.name}</div>
                <div className="text-xs text-navy-400">{sim.to.brand.name} · {sim.to.category.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 出典 */}
      {sources.length > 0 && (
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">出典URL一覧</p>
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <Badge variant={s.reliability >= 0.7 ? "info" : "warn"} className="text-[9px] shrink-0">信頼度 {Math.round(s.reliability * 100)}</Badge>
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-navy-600 hover:underline break-all">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Link href="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" />ダッシュボードに戻る</Button></Link>
      </div>
    </div>
  );
}
