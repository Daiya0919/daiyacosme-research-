/**
 * src/lib/scoring.ts
 *
 * SKUのスコアリング。受賞履歴から10種のサブスコアを計算し、
 * 重み付き合計で総合スコアを算出する。
 *
 * すべて0-100に正規化して返す。
 */

const CURRENT_YEAR = 2025;
const TREND_WINDOW = [2024, 2025];
const CLASSIC_WINDOW = [2021, 2022, 2023, 2024, 2025];

type AwardLite = { mediaType: string; weight: number };
type AwardResultLite = {
  year: number;
  rank: number | null;
  award: AwardLite;
  comment?: string | null;
  reason?: string | null;
};
import { asList } from "./utils";

type SkuLite = {
  id: string;
  ingredients?: unknown;
  skinConcerns?: unknown;
  price?: number | null;
};

/** 順位を点数化: 1位=100, 2位=85, 3位=72, ... 入賞のみ=50 */
function rankToPoints(rank: number | null | undefined): number {
  if (!rank) return 50;
  if (rank <= 0) return 50;
  return Math.max(20, 100 - (rank - 1) * 12);
}

export function awardScore(results: AwardResultLite[]): number {
  if (!results.length) return 0;
  const sum = results.reduce((acc, r) => acc + rankToPoints(r.rank) * r.award.weight, 0);
  return clip01to100(sum / (results.length * 1.5)); // 受賞数の割に質が高いほど伸びるよう重み平均
}

export function trendScore(results: AwardResultLite[]): number {
  const recent = results.filter((r) => TREND_WINDOW.includes(r.year));
  const older = results.filter((r) => r.year < TREND_WINDOW[0]);
  const ugcRecent = recent.filter((r) => r.award.mediaType === "ugc" || r.award.mediaType === "ec");
  const base = recent.length * 18 + ugcRecent.length * 8;
  const growth = older.length === 0 && recent.length > 0 ? 25 : 0; // 直近で出てきた新顔
  return clip01to100(base + growth);
}

export function classicScore(results: AwardResultLite[]): number {
  const yearsSet = new Set(results.filter((r) => CLASSIC_WINDOW.includes(r.year)).map((r) => r.year));
  const continuity = yearsSet.size; // 0..5
  const cross = new Set(results.map((r) => r.award.mediaType)).size; // 媒体横断
  return clip01to100(continuity * 18 + cross * 6);
}

export function reviewPowerScore(results: AwardResultLite[]): number {
  const ugc = results.filter((r) => r.award.mediaType === "ugc");
  return clip01to100(ugc.length * 22 + ugc.reduce((a, r) => a + rankToPoints(r.rank), 0) / 4);
}

export function ecPowerScore(results: AwardResultLite[]): number {
  const ec = results.filter((r) => r.award.mediaType === "ec");
  return clip01to100(ec.length * 28 + ec.reduce((a, r) => a + rankToPoints(r.rank), 0) / 3);
}

export function expertScore(results: AwardResultLite[]): number {
  const exp = results.filter((r) => r.award.mediaType === "magazine" || r.award.mediaType === "trade");
  return clip01to100(exp.length * 18 + exp.reduce((a, r) => a + rankToPoints(r.rank), 0) / 4);
}

export function testScore(results: AwardResultLite[]): number {
  const lab = results.filter((r) => r.award.mediaType === "test_lab");
  return clip01to100(lab.length * 35 + lab.reduce((a, r) => a + rankToPoints(r.rank), 0) / 2);
}

/** カテゴリ適合: 受賞アワードカテゴリ名がSKUカテゴリに合致するほど高い（簡易版） */
export function categoryFitScore(results: AwardResultLite[]): number {
  // 受賞数が多いカテゴリほど適合とみなす近似
  return clip01to100(results.length * 12 + 30);
}

/** 差別化: 成分・特徴のユニーク度 */
export function differentiationScore(sku: SkuLite): number {
  const trendyIngredients = ["レチノール", "ナイアシンアミド", "CICA", "PDRN", "ビタミンC", "グルタチオン", "ペプチド", "セラミド", "PHA", "マデカソサイド", "ピテラ"];
  const hits = asList(sku.ingredients).filter((i) => trendyIngredients.some((t) => i.includes(t))).length;
  return clip01to100(40 + hits * 15);
}

/** 市場性: スコア群の総合観 + 価格レンジ補正 */
export function marketabilityScore(sub: {
  awardScore: number;
  trendScore: number;
  reviewPowerScore: number;
  ecPowerScore: number;
  expertScore: number;
  testScore: number;
  differentiationScore: number;
}, sku: SkuLite): number {
  const base =
    sub.awardScore * 0.18 +
    sub.trendScore * 0.18 +
    sub.reviewPowerScore * 0.16 +
    sub.ecPowerScore * 0.14 +
    sub.expertScore * 0.12 +
    sub.testScore * 0.12 +
    sub.differentiationScore * 0.10;
  let bonus = 0;
  if (sku.price != null) {
    if (sku.price <= 2000) bonus += 4; // 入りやすい
    else if (sku.price <= 5000) bonus += 6; // 中価格は最も売れやすい
    else if (sku.price <= 12000) bonus += 3;
  }
  return clip01to100(base + bonus);
}

export function computeTotalScore(sku: SkuLite, results: AwardResultLite[]) {
  const award = awardScore(results);
  const trend = trendScore(results);
  const classic = classicScore(results);
  const review = reviewPowerScore(results);
  const ec = ecPowerScore(results);
  const expert = expertScore(results);
  const test = testScore(results);
  const fit = categoryFitScore(results);
  const diff = differentiationScore(sku);
  const market = marketabilityScore(
    {
      awardScore: award,
      trendScore: trend,
      reviewPowerScore: review,
      ecPowerScore: ec,
      expertScore: expert,
      testScore: test,
      differentiationScore: diff,
    },
    sku,
  );
  // 総合: 市場性中心
  const total =
    award * 0.16 +
    trend * 0.12 +
    classic * 0.12 +
    review * 0.10 +
    ec * 0.08 +
    expert * 0.10 +
    test * 0.08 +
    fit * 0.06 +
    diff * 0.08 +
    market * 0.10;
  return {
    awardScore: round2(award),
    trendScore: round2(trend),
    classicScore: round2(classic),
    categoryFitScore: round2(fit),
    reviewPowerScore: round2(review),
    ecPowerScore: round2(ec),
    expertScore: round2(expert),
    testScore: round2(test),
    differentiationScore: round2(diff),
    marketabilityScore: round2(market),
    totalScore: round2(total),
  };
}

export function classifyTrendOrClassic(results: AwardResultLite[]): "trend" | "classic" | "both" | "unknown" {
  if (!results.length) return "unknown";
  const yearsSet = new Set(results.map((r) => r.year));
  const continuous = [...CLASSIC_WINDOW].filter((y) => yearsSet.has(y)).length;
  const recentRatio = results.filter((r) => TREND_WINDOW.includes(r.year)).length / results.length;
  const isClassic = continuous >= 3;
  const isTrend = recentRatio >= 0.5 && results.filter((r) => r.year < 2023).length <= 1;
  if (isClassic && isTrend) return "both";
  if (isTrend) return "trend";
  if (isClassic) return "classic";
  return "unknown";
}

function clip01to100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const SCORE_KEYS = [
  ["awardScore", "受賞実績"],
  ["trendScore", "トレンド"],
  ["classicScore", "定番"],
  ["categoryFitScore", "カテゴリ適合"],
  ["reviewPowerScore", "口コミ"],
  ["ecPowerScore", "EC"],
  ["expertScore", "専門家"],
  ["testScore", "実測"],
  ["differentiationScore", "差別化"],
  ["marketabilityScore", "市場性"],
] as const;
