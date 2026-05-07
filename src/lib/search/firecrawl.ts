import type { SearchProvider, SearchQuery, SearchHit } from "./types";

/**
 * FirecrawlSearchProvider:
 *   POST https://api.firecrawl.dev/v1/search
 *   { "query": "...", "limit": 10 }
 *
 * APIキーは process.env.FIRECRAWL_API_KEY から読む。
 * レート制限とリトライ（指数バックオフ）を実装。
 */
export class FirecrawlSearchProvider implements SearchProvider {
  readonly name = "firecrawl";
  constructor(private readonly apiKey: string) {}

  async search(q: SearchQuery): Promise<SearchHit[]> {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is not set");
    const limit = q.limit ?? 10;
    const body = JSON.stringify({ query: q.query, limit });

    const maxAttempts = 3;
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body,
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Firecrawl ${res.status}`);
        }
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Firecrawl ${res.status}: ${t}`);
        }
        const json = (await res.json()) as { data?: Array<{ url: string; title?: string; description?: string; publishedDate?: string }> };
        return (json.data ?? []).map((d) => ({
          url: d.url,
          title: d.title ?? d.url,
          snippet: d.description,
          publishedAt: d.publishedDate,
          source: "firecrawl",
          reliability: 0.7,
        }));
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt - 1)));
      }
    }
    throw lastErr ?? new Error("Firecrawl unknown error");
  }
}
