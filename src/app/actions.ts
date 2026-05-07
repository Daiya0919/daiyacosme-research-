"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { runResearch, type RunResearchParams } from "@/lib/research-job";
import { rebuildDaiyaCosmeRankings } from "@/lib/daiyacosme";
import { prisma } from "@/lib/prisma";
import { computeTotalScore, classifyTrendOrClassic } from "@/lib/scoring";
import { getAiProvider } from "@/lib/ai";
import { normalize, similarity } from "@/lib/normalize";
import { asList, listToJson } from "@/lib/utils";

const ResearchSchema = z.object({
  years: z.array(z.number().int().min(2018).max(2030)).min(1),
  awardSlugs: z.array(z.string()).min(1),
  categories: z.array(z.string()).optional(),
  extraKeyword: z.string().optional(),
  perQueryLimit: z.number().int().min(1).max(20).optional(),
});

export async function runResearchAction(params: RunResearchParams) {
  const v = ResearchSchema.parse(params);
  const result = await runResearch(v);
  revalidatePath("/research");
  revalidatePath("/admin");
  return result;
}

/**
 * スコア再計算 + DaiyaCosme賞再構築。
 * リサーチでSourceが増えた後 / 手動修正の後に呼ぶ。
 */
export async function rebuildAction() {
  const skus = await prisma.sKU.findMany({
    include: { awardResults: { include: { award: true } } },
  });
  for (const sku of skus) {
    const { totalScore, ...sub } = computeTotalScore(sku, sku.awardResults);
    await prisma.sKU.update({
      where: { id: sku.id },
      data: { ...sub, totalScore, trendOrClassic: classifyTrendOrClassic(sku.awardResults) },
    });
  }
  await rebuildDaiyaCosmeRankings(prisma);
  revalidatePath("/");
  revalidatePath("/category");
  return { ok: true, skus: skus.length };
}

/**
 * 単一SKUのAI再分析。LLM_PROVIDERが mock 以外なら実APIを叩く。
 */
export async function regenerateSkuAnalysisAction(skuId: string) {
  const sku = await prisma.sKU.findUnique({
    where: { id: skuId },
    include: { brand: true, category: true, awardResults: { include: { award: true } } },
  });
  if (!sku) throw new Error("sku not found");
  const ai = getAiProvider();
  const result = await ai.analyzeSku({
    name: sku.name,
    brand: sku.brand.name,
    category: sku.category.name,
    ingredients: asList(sku.ingredients),
    skinConcerns: asList(sku.skinConcerns),
    awards: sku.awardResults.map((r) => ({
      year: r.year,
      awardName: r.award.name,
      awardCategory: r.awardCategory,
      rank: r.rank,
      comment: r.comment,
    })),
    scores: {
      awardScore: sku.awardScore, trendScore: sku.trendScore, classicScore: sku.classicScore,
      reviewPowerScore: sku.reviewPowerScore, ecPowerScore: sku.ecPowerScore,
      expertScore: sku.expertScore, testScore: sku.testScore,
      differentiationScore: sku.differentiationScore, marketabilityScore: sku.marketabilityScore,
      totalScore: sku.totalScore,
    },
  });
  await prisma.sKUAnalysis.create({
    data: { skuId, ...result, llmProvider: ai.name },
  });
  revalidatePath(`/sku/${skuId}`);
  return result;
}

/**
 * 表記揺れ候補を抽出する（normalizedName類似度0.8以上）
 */
export async function findDuplicateCandidatesAction(threshold = 0.8) {
  const skus = await prisma.sKU.findMany({ select: { id: true, name: true, normalizedName: true } });
  const pairs: Array<{ a: { id: string; name: string }; b: { id: string; name: string }; score: number }> = [];
  for (let i = 0; i < skus.length; i++) {
    for (let j = i + 1; j < skus.length; j++) {
      const sc = similarity(skus[i].normalizedName, skus[j].normalizedName);
      if (sc >= threshold) {
        pairs.push({ a: { id: skus[i].id, name: skus[i].name }, b: { id: skus[j].id, name: skus[j].name }, score: Math.round(sc * 100) / 100 });
      }
    }
  }
  return pairs;
}

/** 2つのSKUを統合する: keep にAwardResultを集約、dropを削除 */
export async function mergeSkuAction(keepId: string, dropId: string) {
  if (keepId === dropId) return { ok: true };
  await prisma.awardResult.updateMany({ where: { skuId: dropId }, data: { skuId: keepId } });
  await prisma.sKUAnalysis.deleteMany({ where: { skuId: dropId } });
  await prisma.similarSKU.deleteMany({ where: { OR: [{ fromId: dropId }, { toId: dropId }] } });
  await prisma.daiyaCosmeRanking.deleteMany({ where: { skuId: dropId } });
  await prisma.sKU.delete({ where: { id: dropId } });
  await rebuildAction();
  return { ok: true };
}

/** SKUを手動編集 */
export async function updateSkuAction(skuId: string, data: { name?: string; ingredients?: string[]; skinConcerns?: string[]; skinTones?: string[]; needsReview?: boolean }) {
  const updateData: any = {};
  if (data.name) {
    updateData.name = data.name;
    updateData.normalizedName = normalize(data.name);
  }
  if (data.ingredients) updateData.ingredients = listToJson(data.ingredients);
  if (data.skinConcerns) updateData.skinConcerns = listToJson(data.skinConcerns);
  if (data.skinTones) updateData.skinTones = listToJson(data.skinTones);
  if (data.needsReview != null) updateData.needsReview = data.needsReview;
  await prisma.sKU.update({ where: { id: skuId }, data: updateData });
  revalidatePath(`/sku/${skuId}`);
  revalidatePath("/admin");
  return { ok: true };
}
