/**
 * scripts/fetch-rakuten-api.ts
 *
 * 楽天 Open API (openapi.rakuten.co.jp) を使って以下を補填:
 *  - catchCopy（商品説明 = API の catchcopy フィールド）
 *  - price（itemPrice）
 *  - imageUrl（mediumImageUrls[0]）
 *  - isQuasiDrug（医薬部外品フラグ）
 *  - lastCrawledAt
 *
 * .env 設定:
 *   RAKUTEN_APP_ID=bba7305e-5701-4269-bd9e-146f421b6573
 *   RAKUTEN_ACCESS_KEY=pk_BDmWZclhKorvme5kBlRCIKkO5imGJv3Mvm6bnYWmGdz
 *
 * 実行: npx tsx scripts/fetch-rakuten-api.ts [--limit=100] [--offset=0]
 *       npx tsx scripts/fetch-rakuten-api.ts --all   ← 全件（約70分）
 */

import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APP_ID     = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const ORIGIN     = "https://daiyacosme-research-snowy.vercel.app";
const DELAY_MS   = 1100; // 1秒/リクエスト制限を考慮

// 新 API エンドポイント (2026/05 現在)
const RAKUTEN_API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401";

if (!APP_ID || !ACCESS_KEY) {
  console.error("❌ .env に RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY を設定してください");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const limit  = args.includes("--all") ? 99999
    : parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1]  ?? "100");
  const offset = parseInt(args.find((a) => a.startsWith("--offset="))?.split("=")[1] ?? "0");
  const refetch = args.includes("--refetch");
  return { limit, offset, refetch };
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, "");
}

interface RakutenItem {
  itemName: string;
  itemPrice: number;
  catchcopy: string;       // 新APIは catchcopy (小文字)
  itemCaption: string;
  mediumImageUrls: { imageUrl: string }[];
  itemUrl: string;
}

async function searchRakuten(brandName: string, skuName: string): Promise<RakutenItem | null> {
  const keyword = encodeURIComponent(`${brandName} ${skuName}`.slice(0, 80));
  const url = `${RAKUTEN_API}?applicationId=${APP_ID}&accessKey=${ACCESS_KEY}`
    + `&keyword=${keyword}&hits=5&sort=standard&format=json`;

  try {
    const res = await fetch(url, {
      headers: { "Origin": ORIGIN },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("  ⚠ rate limit - 15秒待機...");
        await sleep(15000);
      }
      return null;
    }
    const json = await res.json() as { Items?: { Item: RakutenItem }[] };
    if (!json.Items?.length) return null;

    // ブランド名が商品名に含まれるものを優先、なければ先頭
    const nb = brandName.toLowerCase().replace(/\s/g, "");
    const matched = json.Items.find(({ Item }) =>
      Item.itemName.toLowerCase().replace(/\s/g, "").includes(nb)
    );
    return (matched ?? json.Items[0]).Item;
  } catch {
    return null;
  }
}

/** catchcopy / itemCaption から最初の有意な文を抽出 */
function pickCatchCopy(item: RakutenItem): string {
  // 新APIは catchcopy フィールドが直接ある
  const raw = item.catchcopy || item.itemCaption || "";
  if (!raw) return "";
  const decoded = decodeEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const first = decoded.split(/[。！？\n]/)[0].trim();
  if (first.length >= 10 && first.length <= 200) return first;
  return decoded.slice(0, 150).trim();
}

async function main() {
  const { limit, offset, refetch } = parseArgs();

  const where = refetch ? {} : {
    OR: [{ catchCopy: null }, { price: null }],
  };

  const skus = await prisma.sKU.findMany({
    where,
    include: { brand: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

  console.log(`対象 SKU: ${skus.length} 件 (offset=${offset}${refetch ? ", --refetch" : ""})`);
  console.log(`楽天 Open API: ${APP_ID!.slice(0, 8)}...  Origin: ${ORIGIN}`);
  console.log();

  let updated = 0, apiHit = 0;

  for (const [idx, sku] of skus.entries()) {
    process.stdout.write(`  [${idx + 1}/${skus.length}] ${sku.name.slice(0, 35).padEnd(35)} `);

    const item = await searchRakuten(sku.brand.name, sku.name);
    const patch: Record<string, any> = { lastCrawledAt: new Date() };

    if (item) {
      apiHit++;
      if (!sku.catchCopy) {
        const copy = pickCatchCopy(item);
        if (copy) patch.catchCopy = copy;
      }
      if (!sku.price && item.itemPrice >= 500 && item.itemPrice <= 150000) {
        patch.price = item.itemPrice;
      }
      if (!sku.imageUrl && item.mediumImageUrls?.[0]?.imageUrl) {
        patch.imageUrl = item.mediumImageUrls[0].imageUrl;
      }
      if (/医薬部外品|薬用/.test((item.catchcopy ?? "") + (item.itemCaption ?? ""))) {
        patch.isQuasiDrug = true;
      }
    }

    await prisma.sKU.update({ where: { id: sku.id }, data: patch });
    updated++;

    const fields = Object.keys(patch).filter((k) => k !== "lastCrawledAt");
    console.log(item ? `✓ ${fields.join(", ") || "API hit/no new fields"}` : "- no hit");

    await sleep(DELAY_MS);
  }

  console.log(`\n完了: ${updated} 件処理 / API ヒット ${apiHit} 件`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
