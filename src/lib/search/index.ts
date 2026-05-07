import type { SearchProvider } from "./types";
import { MockSearchProvider } from "./mock";
import { FirecrawlSearchProvider } from "./firecrawl";

export * from "./types";

let _provider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (_provider) return _provider;
  const name = (process.env.SEARCH_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "firecrawl":
      _provider = new FirecrawlSearchProvider(process.env.FIRECRAWL_API_KEY ?? "");
      break;
    case "mock":
    default:
      _provider = new MockSearchProvider();
      break;
  }
  return _provider;
}

/**
 * 各アワード × 年度 × カテゴリの検索クエリを自動生成する。
 * 例: "@cosme ベストコスメ 2021 スキンケア 受賞 商品"
 */
export function buildAwardQueries(opts: {
  awardName: string;
  year: number;
  categories?: string[];
  extraKeyword?: string;
}): string[] {
  const cats = opts.categories?.length ? opts.categories : [""];
  return cats.map((c) =>
    [opts.awardName, opts.year, c, "受賞", "商品", opts.extraKeyword]
      .filter(Boolean)
      .join(" ")
      .trim(),
  );
}
