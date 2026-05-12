import { prisma } from "./prisma";
import { asList } from "./utils";

/** CSVセル単位のエスケープ。, " 改行 を含むなら "" でくくる。 */
function esc(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function row(arr: unknown[]) {
  return arr.map(esc).join(",");
}
/** UTF-8 BOM をつけて Excel で文字化けしないようにする */
const BOM = "﻿";

export async function csvSkuMaster(): Promise<string> {
  const skus = await prisma.sKU.findMany({ include: { brand: true, category: true } });
  const lines = [
    row([
      "sku_id", "brand_name", "sku_name", "category", "price", "volume",
      "launch_year", "ingredients", "skin_concerns", "skin_tone_fit",
      "trend_or_classic", "total_score",
      "manufacturer_name", "manufacturer_url",
    ]),
  ];
  for (const s of skus) {
    lines.push(row([
      s.id, s.brand.name, s.name, s.category.name, s.price ?? "", s.volume ?? "",
      s.launchYear ?? "", asList(s.ingredients).join("|"), asList(s.skinConcerns).join("|"),
      asList(s.skinTones).join("|"), s.trendOrClassic, s.totalScore,
      s.manufacturerName ?? "", s.manufacturerUrl ?? "",
    ]));
  }
  return BOM + lines.join("\r\n");
}

export async function csvAwardResults(): Promise<string> {
  const results = await prisma.awardResult.findMany({
    include: { award: true, sku: { include: { brand: true } }, sources: true },
    orderBy: [{ year: "asc" }, { awardId: "asc" }, { rank: "asc" }],
  });
  const lines = [
    row([
      "result_id", "year", "award_name", "award_category", "rank",
      "brand_name", "sku_name", "source_url", "source_title",
      "comment", "confidence_score",
    ]),
  ];
  for (const r of results) {
    const src = r.sources[0];
    lines.push(row([
      r.id, r.year, r.award.name, r.awardCategory, r.rank ?? "",
      r.sku.brand.name, r.sku.name, src?.url ?? "", src?.title ?? "",
      r.comment ?? "", r.confidenceScore,
    ]));
  }
  return BOM + lines.join("\r\n");
}

export async function csvDaiyaCosmeRankings(): Promise<string> {
  const rs = await prisma.daiyaCosmeRanking.findMany({
    include: { sku: { include: { brand: true } } },
    orderBy: [{ daiyaCosmeAwardType: "asc" }, { rank: "asc" }],
  });
  const lines = [
    row([
      "ranking_id", "daiyacosme_award_type", "rank", "sku_id",
      "brand_name", "sku_name",
      "total_score", "award_score", "trend_score", "classic_score",
      "review_power_score", "ec_power_score", "expert_score", "test_score",
      "reason",
    ]),
  ];
  for (const r of rs) {
    lines.push(row([
      r.id, r.daiyaCosmeAwardType, r.rank, r.skuId,
      r.sku.brand.name, r.sku.name,
      r.totalScore, r.awardScore, r.trendScore, r.classicScore,
      r.reviewPowerScore, r.ecPowerScore, r.expertScore, r.testScore,
      r.reason,
    ]));
  }
  return BOM + lines.join("\r\n");
}

export async function csvRawSources(): Promise<string> {
  const ss = await prisma.source.findMany({
    include: { award: true },
    orderBy: [{ fetchedAt: "desc" }],
  });
  const lines = [
    row([
      "source_id", "url", "title", "award_name", "year",
      "fetched_at", "raw_text_excerpt", "reliability", "needs_review",
    ]),
  ];
  for (const s of ss) {
    lines.push(row([
      s.id, s.url, s.title ?? "", s.award?.name ?? "", s.year ?? "",
      s.fetchedAt.toISOString(), s.rawTextExcerpt ?? "",
      s.reliability, s.needsReview,
    ]));
  }
  return BOM + lines.join("\r\n");
}

export const CSV_TYPES = ["sku_master", "award_results", "daiyacosme_rankings", "raw_sources"] as const;
export type CsvType = (typeof CSV_TYPES)[number];

export async function buildCsv(type: CsvType): Promise<string> {
  switch (type) {
    case "sku_master": return csvSkuMaster();
    case "award_results": return csvAwardResults();
    case "daiyacosme_rankings": return csvDaiyaCosmeRankings();
    case "raw_sources": return csvRawSources();
  }
}
