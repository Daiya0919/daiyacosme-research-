import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { yen } from "@/lib/utils";

type Props = {
  rank?: number;
  sku: {
    id: string;
    name: string;
    imageUrl?: string | null;
    productUrl?: string | null;
    price?: number | null;
    totalScore: number;
    trendOrClassic: string;
    brand: { name: string; isKorean: boolean };
    category?: { name: string };
    awardResults: Array<{ award: { name: string; slug: string }; year: number; rank: number | null }>;
  };
  reason?: string;
};

const trendVariant: Record<string, "trend" | "classic" | "both" | "secondary"> = {
  trend: "trend", classic: "classic", both: "both", unknown: "secondary",
};

export function SkuCard({ rank, sku, reason }: Props) {
  const awardCount = sku.awardResults.length;
  const topAwards = Array.from(new Set(sku.awardResults.map((a) => a.award.name))).slice(0, 3);

  return (
    <Card className="relative hover:shadow-md transition-shadow border-zinc-200 hover:border-rose-200">
      {/* 全面オーバーレイで詳細ページへ。販売ページリンクのみ z-20 で前に出す */}
      <Link href={`/sku/${sku.id}`} className="absolute inset-0 z-10" aria-label={`${sku.name} の詳細`}>
        <span className="sr-only">{sku.name}</span>
      </Link>

      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-14 h-14 rounded-md bg-zinc-50 overflow-hidden flex items-center justify-center text-zinc-400 text-[10px]">
            {sku.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span>NO IMG</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {rank != null && <span className="text-xs font-bold text-rose-600">#{rank}</span>}
              <span className="text-xs text-zinc-500 truncate">{sku.brand.name}</span>
              {sku.brand.isKorean && <Badge variant="info">K</Badge>}
            </div>
            <h4 className="text-sm font-semibold leading-tight line-clamp-2">{sku.name}</h4>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
              <span>{yen(sku.price)}</span>
              {sku.category && <span>· {sku.category.name}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-rose-600">{Math.round(sku.totalScore)}</div>
            <div className="text-[10px] text-zinc-500">SCORE</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant={trendVariant[sku.trendOrClassic] ?? "secondary"}>
            {sku.trendOrClassic === "trend" ? "トレンド"
              : sku.trendOrClassic === "classic" ? "定番"
              : sku.trendOrClassic === "both" ? "両立"
              : "—"}
          </Badge>
          <Badge variant="secondary">受賞{awardCount}</Badge>
          {topAwards.map((n) => (
            <Badge key={n} variant="outline" className="text-[10px]">
              {short(n)}
            </Badge>
          ))}
        </div>

        {reason && <p className="mt-2 text-[11px] text-zinc-600 line-clamp-2">{reason}</p>}

        {sku.productUrl && (
          <div className="mt-2 flex items-center justify-end relative z-20">
            <a
              href={sku.productUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              販売ページ
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

function short(name: string): string {
  return name.replace("ベストコスメアワード", "").replace("ベストコスメ", "").replace("BEST COSMETICS", "").trim();
}
