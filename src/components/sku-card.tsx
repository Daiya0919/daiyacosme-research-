import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import { yen } from "@/lib/utils";

type Props = {
  rank?: number;
  sku: {
    id: string;
    name: string;
    nameKorean?: string | null;
    imageUrl?: string | null;
    productUrl?: string | null;
    price?: number | null;
    totalScore: number;
    trendOrClassic: string;
    isQuasiDrug?: boolean;
    spf?: number | null;
    pa?: string | null;
    season?: string | null;
    brand: { name: string; isKorean: boolean };
    category?: { name: string };
    awardResults: Array<{ award: { name: string; slug: string }; year: number; rank: number | null }>;
  };
  reason?: string;
};

const trendVariant: Record<string, "trend" | "classic" | "both" | "secondary"> = {
  trend: "trend", classic: "classic", both: "both", unknown: "secondary",
};

const seasonLabel: Record<string, string> = { summer: "夏", winter: "冬", both: "通年" };

export function SkuCard({ rank, sku, reason }: Props) {
  const awardCount = sku.awardResults.length;
  const topAwards = Array.from(new Set(sku.awardResults.map((a) => a.award.name))).slice(0, 2);
  const latestYear = Math.max(...sku.awardResults.map((a) => a.year), 0);

  return (
    <div className="relative rounded-lg border border-navy-100 bg-white shadow-card hover:border-navy-300 hover:shadow-card-hover transition-all group">
      <Link href={`/sku/${sku.id}`} className="absolute inset-0 z-10" aria-label={`${sku.name} の詳細`}>
        <span className="sr-only">{sku.name}</span>
      </Link>

      <div className="p-3">
        {/* スコアバー */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {rank != null && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-navy-900 text-[10px] font-bold text-white">{rank}</span>
            )}
            {sku.brand.isKorean && <span className="text-[9px] font-bold rounded bg-amber-500 text-white px-1 py-0.5">K</span>}
            {sku.isQuasiDrug && <span className="text-[9px] font-bold rounded bg-purple-100 text-purple-700 px-1 py-0.5">医薬部外品</span>}
          </div>
          <div className="text-right">
            <span className="text-base font-bold tabular-nums text-amber-500">{Math.round(sku.totalScore)}</span>
            <span className="text-[9px] text-navy-300 ml-0.5">pt</span>
          </div>
        </div>

        {/* 画像 + 情報 */}
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-12 h-12 rounded border border-navy-100 bg-navy-50 overflow-hidden flex items-center justify-center">
            {sku.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-[9px] text-navy-300 font-mono">IMG</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-navy-400 truncate">{sku.brand.name}</div>
            <h4 className="text-xs font-semibold leading-snug line-clamp-2 text-navy-900 mt-0.5">{sku.name}</h4>
            {sku.nameKorean && (
              <div className="text-[10px] text-navy-400 mt-0.5 truncate">{sku.nameKorean}</div>
            )}
          </div>
        </div>

        {/* メタデータ行 */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-navy-400">
          {sku.price && <span className="tabular-nums">{yen(sku.price)}</span>}
          {sku.category && <span>{sku.category.name}</span>}
          {sku.spf && <span>SPF{sku.spf}{sku.pa ? `/${sku.pa}` : ""}</span>}
          {sku.season && <span>{seasonLabel[sku.season] ?? sku.season}</span>}
          {latestYear > 0 && <span>{latestYear}年受賞</span>}
        </div>

        {/* バッジ */}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant={trendVariant[sku.trendOrClassic] ?? "secondary"} className="text-[9px] py-0 px-1.5">
            {sku.trendOrClassic === "trend" ? "トレンド" : sku.trendOrClassic === "classic" ? "定番" : sku.trendOrClassic === "both" ? "両立" : "—"}
          </Badge>
          <Badge variant="secondary" className="text-[9px] py-0 px-1.5">受賞{awardCount}件</Badge>
          {topAwards.map((n) => (
            <Badge key={n} variant="outline" className="text-[9px] py-0 px-1.5">{short(n)}</Badge>
          ))}
        </div>

        {reason && <p className="mt-1.5 text-[10px] text-navy-500 line-clamp-2 leading-relaxed">{reason}</p>}

        {sku.productUrl && (
          <div className="mt-2 flex justify-end relative z-20">
            <a href={sku.productUrl} target="_blank" rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:underline">
              <ExternalLink className="h-3 w-3" />販売ページ
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function short(name: string): string {
  return name
    .replace("ベストコスメアワード", "").replace("ベストコスメ", "")
    .replace("BEST COSMETICS", "").replace("アワード", "").trim().slice(0, 10);
}
