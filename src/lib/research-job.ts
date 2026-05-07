/**
 * リサーチジョブ。
 *  - 指定アワード × 年度 × カテゴリで検索クエリを生成
 *  - SearchProvider で検索
 *  - 結果をSourceとして保存（needsReviewはreliability < 0.6で立てる）
 *  - 取得テキストの構造化はphase2（LLMで抽出する想定。ここでは雛形のみ）
 *
 * 注意:
 *  - スクレイピングはrobots.txt/利用規約に従う
 *  - 受賞SKUの生成はseedから上書きせず、Sourceの追加までに留める
 *  - 詳細な抽出はLLMに渡してJSON化する箇所をTODOで明示
 */

import { prisma } from "./prisma";
import { getSearchProvider, buildAwardQueries } from "./search";
import type { SearchHit } from "./search/types";

export type RunResearchParams = {
  years: number[];
  awardSlugs?: string[]; // 未指定なら全アワード
  categories?: string[];
  extraKeyword?: string;
  perQueryLimit?: number;
};

export async function runResearch(params: RunResearchParams) {
  const job = await prisma.researchJob.create({
    data: { params: JSON.stringify(params), status: "running" },
  });

  let collected = 0;
  let needsReview = 0;
  try {
    const provider = getSearchProvider();
    const allAwards = await prisma.award.findMany();
    const awards = params.awardSlugs?.length
      ? allAwards.filter((a) => params.awardSlugs!.includes(a.slug))
      : allAwards;

    await prisma.researchLog.create({
      data: { jobId: job.id, level: "info", message: `provider=${provider.name} awards=${awards.length} years=${params.years.join(",")}` },
    });

    for (const award of awards) {
      for (const year of params.years) {
        const queries = buildAwardQueries({
          awardName: award.name,
          year,
          categories: params.categories,
          extraKeyword: params.extraKeyword,
        });
        for (const q of queries) {
          let hits: SearchHit[] = [];
          try {
            hits = await provider.search({ query: q, awardSlug: award.slug, year, limit: params.perQueryLimit ?? 5 });
          } catch (e) {
            await prisma.researchLog.create({
              data: { jobId: job.id, level: "warn", message: `search failed for "${q}": ${(e as Error).message}` },
            });
            continue;
          }
          for (const hit of hits) {
            const reliability = hit.reliability ?? 0.5;
            const needs = reliability < 0.6;
            if (needs) needsReview++;
            try {
              await prisma.source.upsert({
                where: { url_awardId_year: { url: hit.url, awardId: award.id, year } },
                update: {
                  title: hit.title,
                  rawTextExcerpt: hit.snippet,
                  reliability,
                  needsReview: needs,
                },
                create: {
                  url: hit.url,
                  title: hit.title,
                  awardId: award.id,
                  year,
                  rawTextExcerpt: hit.snippet,
                  reliability,
                  needsReview: needs,
                },
              });
              collected++;
            } catch (e) {
              await prisma.researchLog.create({
                data: { jobId: job.id, level: "warn", message: `upsert failed: ${(e as Error).message}` },
              });
            }
          }
          await prisma.researchLog.create({
            data: { jobId: job.id, level: "info", message: `query="${q}" hits=${hits.length}` },
          });
        }
      }
    }

    await prisma.researchJob.update({
      where: { id: job.id },
      data: { status: "completed", finishedAt: new Date(), collected, needsReview },
    });
    return { jobId: job.id, collected, needsReview };
  } catch (e) {
    await prisma.researchJob.update({
      where: { id: job.id },
      data: { status: "failed", finishedAt: new Date(), error: (e as Error).message, collected, needsReview },
    });
    throw e;
  }
}
