/**
 * scripts/export-data.ts
 *
 * 全テーブルを `migrations/snapshot/{model}.json` にダンプ。
 * 別環境で `scripts/import-data.ts` を実行すると完全再現できる。
 *
 * 実行: DATABASE_URL=<source-url> npx tsx scripts/export-data.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const OUT_DIR = path.resolve("migrations/snapshot");

async function dump(name: string, rows: unknown[]) {
  const file = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
  console.log(`  ${name.padEnd(22)} ${String(rows.length).padStart(6)} rows  →  ${file}`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Exporting all tables...");
  // Order matches FK dependency
  await dump("award", await prisma.award.findMany({ orderBy: { id: "asc" } }));
  await dump("brand", await prisma.brand.findMany({ orderBy: { id: "asc" } }));
  await dump("category", await prisma.category.findMany({ orderBy: { id: "asc" } }));
  await dump("sku", await prisma.sKU.findMany({ orderBy: { id: "asc" } }));
  await dump("awardResult", await prisma.awardResult.findMany({ orderBy: { id: "asc" } }));
  await dump("source", await prisma.source.findMany({ orderBy: { id: "asc" } }));
  await dump("daiyaCosmeRanking", await prisma.daiyaCosmeRanking.findMany({ orderBy: { id: "asc" } }));
  await dump("sKUAnalysis", await prisma.sKUAnalysis.findMany({ orderBy: { id: "asc" } }));
  await dump("similarSKU", await prisma.similarSKU.findMany({ orderBy: { id: "asc" } }));
  await dump("researchJob", await prisma.researchJob.findMany({ orderBy: { id: "asc" } }));
  await dump("researchLog", await prisma.researchLog.findMany({ orderBy: { id: "asc" } }));

  // メタ情報（再現時に検証する用）
  const meta = {
    exportedAt: new Date().toISOString(),
    counts: {
      award: await prisma.award.count(),
      brand: await prisma.brand.count(),
      category: await prisma.category.count(),
      sku: await prisma.sKU.count(),
      awardResult: await prisma.awardResult.count(),
      source: await prisma.source.count(),
      daiyaCosmeRanking: await prisma.daiyaCosmeRanking.count(),
      sKUAnalysis: await prisma.sKUAnalysis.count(),
      similarSKU: await prisma.similarSKU.count(),
      researchJob: await prisma.researchJob.count(),
      researchLog: await prisma.researchLog.count(),
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, "_meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`\n✓ Export complete (exported at ${meta.exportedAt})`);
  console.log(JSON.stringify(meta.counts, null, 2));
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
