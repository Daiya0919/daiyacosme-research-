import type { SearchProvider, SearchQuery, SearchHit } from "./types";

/**
 * MockSearchProvider: 実APIを叩かずにJobの動作確認ができるプロバイダ。
 * 実装を差し替えるときは src/lib/search/index.ts の getSearchProvider() を変える。
 */
export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";
  async search(q: SearchQuery): Promise<SearchHit[]> {
    const limit = q.limit ?? 5;
    const base = `https://example.com/${q.awardSlug ?? "search"}/${q.year ?? "any"}`;
    return Array.from({ length: limit }).map((_, i) => ({
      url: `${base}/${encodeURIComponent(q.query)}/${i + 1}`,
      title: `${q.query} – 受賞一覧 (mock #${i + 1})`,
      snippet: `mock検索結果。実際のWeb検索プロバイダ(SEARCH_PROVIDER=firecrawl|tavily|serpapi)に切り替えてください。`,
      source: "mock",
      reliability: 0.4,
    }));
  }
}
