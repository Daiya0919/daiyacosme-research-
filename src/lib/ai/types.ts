export type SkuAnalysisInput = {
  name: string;
  brand: string;
  category: string;
  ingredients: string[];
  skinConcerns: string[];
  awards: Array<{ year: number; awardName: string; awardCategory: string; rank: number | null; comment?: string | null }>;
  scores: {
    awardScore: number; trendScore: number; classicScore: number;
    reviewPowerScore: number; ecPowerScore: number; expertScore: number;
    testScore: number; differentiationScore: number; marketabilityScore: number;
    totalScore: number;
  };
};

export type SkuAnalysisOutput = {
  whySelling: string;
  whoFits: string;
  trendOrClassic: "trend" | "classic" | "both" | "unknown";
  developmentHint: string;
  marketGap: string;
};

export type MarketTrendInput = {
  byYear: Array<{ year: number; count: number; korean: number; depacos: number; pricey: number }>;
  topIngredients: Array<{ ingredient: string; count: number }>;
  topConcerns: Array<{ concern: string; count: number }>;
};

export type MarketTrendOutput = {
  yearlyShift: string;
  categoryGrowth: string;
  koreanRatio: string;
  ingredientTrend: string;
  concernTrend: string;
  developmentSuggestion: string;
};

export interface AiProvider {
  readonly name: string;
  analyzeSku(input: SkuAnalysisInput): Promise<SkuAnalysisOutput>;
  analyzeMarketTrend(input: MarketTrendInput): Promise<MarketTrendOutput>;
}
