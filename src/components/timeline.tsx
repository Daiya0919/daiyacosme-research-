import { Badge } from "./ui/badge";

type Item = { award: { name: string; slug: string }; year: number; rank: number | null; awardCategory: string; comment?: string | null };

export function AwardTimeline({ items }: { items: Item[] }) {
  const byYear = new Map<number, Item[]>();
  for (const it of items) {
    const arr = byYear.get(it.year) ?? [];
    arr.push(it);
    byYear.set(it.year, arr);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  if (!years.length) return <p className="text-sm text-zinc-500">受賞履歴なし</p>;

  return (
    <ol className="relative border-l border-zinc-200 pl-5 space-y-4">
      {years.map((y) => (
        <li key={y} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-rose-500" />
          <div className="text-sm font-semibold mb-1">{y}年</div>
          <div className="space-y-1">
            {byYear.get(y)!.map((it, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="info">{it.award.name.replace("ベストコスメアワード", "").replace("ベストコスメ", "").replace("BEST COSMETICS", "").trim()}</Badge>
                <span className="text-zinc-600">{it.awardCategory}</span>
                {it.rank && <span className="text-rose-600 font-bold">#{it.rank}</span>}
                {it.comment && <span className="text-zinc-500 line-clamp-1">— {it.comment}</span>}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
