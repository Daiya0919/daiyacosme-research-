"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { runResearchAction } from "../actions";

const YEARS = [2021, 2022, 2023, 2024, 2025];

export function ResearchForm({
  awards,
  categories,
}: {
  awards: { slug: string; name: string }[];
  categories: string[];
}) {
  const [years, setYears] = React.useState<number[]>([2024, 2025]);
  const [slugs, setSlugs] = React.useState<string[]>(awards.map((a) => a.slug));
  const [cats, setCats] = React.useState<string[]>([]);
  const [keyword, setKeyword] = React.useState("");
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const onRun = () => {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const res = await runResearchAction({
          years,
          awardSlugs: slugs,
          categories: cats,
          extraKeyword: keyword || undefined,
        });
        setResult(`ジョブ完了: 取得${res.collected}件 / 要確認${res.needsReview}件`);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-zinc-600 mb-1.5">年度</div>
        <div className="flex flex-wrap gap-1">
          {YEARS.map((y) => (
            <button key={y} type="button" onClick={() => setYears((arr) => toggle(arr, y))}>
              <Badge variant={years.includes(y) ? "default" : "secondary"}>{y}</Badge>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-zinc-600 mb-1.5">アワード</div>
        <div className="flex flex-wrap gap-1">
          {awards.map((a) => (
            <button key={a.slug} type="button" onClick={() => setSlugs((arr) => toggle(arr, a.slug))}>
              <Badge variant={slugs.includes(a.slug) ? "default" : "secondary"}>{a.name}</Badge>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-zinc-600 mb-1.5">カテゴリ（任意）</div>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCats((arr) => toggle(arr, c))}>
              <Badge variant={cats.includes(c) ? "default" : "secondary"}>{c}</Badge>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-zinc-600 mb-1.5">追加キーワード（任意）</div>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例: 韓国コスメ / レチノール / プチプラ" className="max-w-md" />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onRun} disabled={pending || years.length === 0 || slugs.length === 0}>
          {pending ? "実行中…" : "Web検索を実行"}
        </Button>
        {result && <span className="text-sm text-emerald-700">{result}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-zinc-500">
        現在のSEARCH_PROVIDERは <code>{process.env.NEXT_PUBLIC_SEARCH_PROVIDER ?? "(server)"}</code>。
        モック以外を使う場合は <code>.env</code> の <code>SEARCH_PROVIDER</code> と各APIキーを設定してください。
      </p>
    </div>
  );
}
