/**
 * scripts/import-data.ts
 *
 * `migrations/snapshot/*.json` から全テーブルを新DBへ流し込む。
 *
 * 前提: 新DBはスキーマ反映済み (`npx prisma db push` 実行済み)
 * 注意: 既存データは全削除して上書きする (--accept-data-loss 相当)
 *
 * 実行: DATABASE_URL=<target-url> npx tsx scripts/import-data.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const IN_DIR = path.resolve("migrations/snapshot");

function loadJson(name: string): any[] {
  const file = path.join(IN_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  [skip] ${name}.json not found`);
    return [];
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

// Date文字列をDateオブジェクトに戻す（フィールド名で判別）
function reviveDates<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((r) => {
    const out: any = { ...r };
    for (const k of Object.keys(out)) {
      const v = out[k];
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v) && (k.endsWith("At") || k.includes("Date"))) {
        out[k] = new Date(v);
      }
    }
    return out;
  });
}

async function clearAll() {
  console.log("Clearing target database (in FK order)...");
  await prisma.researchLog.deleteMany();
  await prisma.researchJob.deleteMany();
  await prisma.similarSKU.deleteMany();
  await prisma.sKUAnalysis.deleteMany();
  await prisma.daiyaCosmeRanking.deleteMany();
  await prisma.source.deleteMany();
  await prisma.awardResult.deleteMany();
  await prisma.sKU.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.award.deleteMany();
}

async function insertMany<T>(name: string, model: { createMany: (args: any) => Promise<any> }, rows: T[]) {
  if (rows.length === 0) {
    console.log(`  ${name.padEnd(22)} (empty)`);
    return;
  }
  // バッチで分割 (1回200件)
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await model.createMany({ data: batch as any, skipDuplicates: true });
    inserted += batch.length;
  }
  console.log(`  ${name.padEnd(22)} ${String(inserted).padStart(6)} rows`);
}

async function main() {
  if (!fs.existsSync(IN_DIR)) {
    throw new Error(`snapshot dir not found: ${IN_DIR}. Run export-data.ts first.`);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(IN_DIR, "_meta.json"), "utf-8"));
  console.log(`Importing from snapshot exported at ${meta.exportedAt}`);
  console.log(`Source counts:`, meta.counts);
  console.log();

  await clearAll();

  console.log("\nLoading + inserting...");
  // FK 順
  await insertMany("award", prisma.award, reviveDates(loadJson("award")));
  await insertMany("brand", prisma.brand, reviveDates(loadJson("brand")));
  await insertMany("category", prisma.category, reviveDates(loadJson("category")));
  await insertMany("sku", prisma.sKU, reviveDates(loadJson("sku")));
  await insertMany("awardResult", prisma.awardResult, reviveDates(loadJson("awardResult")));
  await insertMany("source", prisma.source, reviveDates(loadJson("source")));
  await insertMany("daiyaCosmeRanking", prisma.daiyaCosmeRanking, reviveDates(loadJson("daiyaCosmeRanking")));
  await insertMany("sKUAnalysis", prisma.sKUAnalysis, reviveDates(loadJson("sKUAnalysis")));
  await insertMany("similarSKU", prisma.similarSKU, reviveDates(loadJson("similarSKU")));
  await insertMany("researchJob", prisma.researchJob, reviveDates(loadJson("researchJob")));
  await insertMany("researchLog", prisma.researchLog, reviveDates(loadJson("researchLog")));

  console.log("\nVerifying counts...");
  const counts = {
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
  };
  console.log(counts);

  // 差分検証
  let ok = true;
  for (const k of Object.keys(counts) as Array<keyof typeof counts>) {
    if (counts[k] !== meta.counts[k]) {
      console.warn(`  ⚠ ${k}: target=${counts[k]} source=${meta.counts[k]}`);
      ok = false;
    }
  }
  if (ok) console.log("\n✓ All counts match source. Import successful.");
  else console.log("\n⚠ Some tables didn't match. Inspect the diffs above.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
