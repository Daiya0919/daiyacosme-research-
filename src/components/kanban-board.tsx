import { SkuCard } from "./sku-card";
import { DAIYACOSME_AWARDS } from "@/lib/daiyacosme";

type RankRow = {
  id: string;
  daiyaCosmeAwardType: string;
  rank: number;
  reason: string;
  sku: {
    id: string;
    name: string;
    imageUrl: string | null;
    productUrl: string | null;
    price: number | null;
    totalScore: number;
    trendOrClassic: string;
    brand: { name: string; isKorean: boolean };
    category: { name: string };
    awardResults: Array<{ award: { name: string; slug: string }; year: number; rank: number | null }>;
  };
};

export function KanbanBoard({ rankings }: { rankings: RankRow[] }) {
  const grouped = new Map<string, RankRow[]>();
  for (const r of rankings) {
    const arr = grouped.get(r.daiyaCosmeAwardType) ?? [];
    arr.push(r);
    grouped.set(r.daiyaCosmeAwardType, arr);
  }
  for (const arr of grouped.values()) arr.sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
      {DAIYACOSME_AWARDS.map((def) => {
        const rows = grouped.get(def.type) ?? [];
        return (
          <div
            key={def.type}
            className="snap-start w-[320px] shrink-0 rounded-xl bg-zinc-50 border border-zinc-200"
          >
            <div className="px-3 py-2 border-b bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{def.label}</h3>
                <span className="text-xs text-zinc-500">{rows.length}件</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{def.description}</p>
              <div className="mt-1.5 flex items-start gap-1.5">
                <span className="inline-block shrink-0 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold tracking-wide">
                  選定式
                </span>
                <p className="text-[11px] text-zinc-700 leading-snug font-mono break-all">
                  {def.formula}
                </p>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
              {rows.map((r) => (
                <SkuCard key={r.id} rank={r.rank} sku={r.sku} reason={r.reason} />
              ))}
              {rows.length === 0 && (
                <div className="text-center text-xs text-zinc-400 py-6">該当なし</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
