export type SearchHit = {
  url: string;
  title: string;
  snippet?: string;
  publishedAt?: string;
  source?: string;
  reliability?: number; // 0..1
};

export type SearchQuery = {
  query: string;
  awardSlug?: string;
  year?: number;
  category?: string;
  limit?: number;
};

export interface SearchProvider {
  readonly name: string;
  search(q: SearchQuery): Promise<SearchHit[]>;
}
