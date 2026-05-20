/**
 * scripts/fetch-rakuten-api.ts
 *
 * 楽天商品検索API を使って以下を補填:
 *  - catchCopy（商品説明）
 *  - price（価格）
 *  - imageUrl（画像URL）
 *  - isQuasiDrug（医薬部外品フラグ）
 *  - lastCrawledAt
 *
 * 事前準備:
 *   1. https://webservice.rakuten.co.jp/ でアプリIDを取得
 *   2. .env に RAKUTEN_APP_ID=xxxxxxxxxx を追加
 *
 * 実行: npx tsx scripts/fetch-rakuten-api.ts [--limit=100] [--offset=0]
 *       npx tsx scripts/fetch-rakuten-api.ts --all   ← 全件
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APP_ID = process.env.RAKUTEN_APP_ID;
const DELAY_MS = 1000; // API制限: 1秒1リクエスト推奨

if (!APP_ID) {
  console.error("❌ RAKUTEN_APP_ID が .env に設定されていません");
  console.error("   https://webservice.rakuten.co.jp/ でアプリIDを取得してください");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const limit  = args.includes("--all") ? 99999
    : parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "100");
  const offset = parseInt(args.find((a) => a.startsWith("--offset="))?.split("=")[1] ?? "0");
  const refetch = args.includes("--refetch");
  return { limit, offset, refetch };
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** HTMLエンティティをデコード */
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
  itemCaption: string;
  mediumImageUrls: { imageUrl: string }[];
  itemUrl: string;
}

/**
 * 楽天商品検索API で SKU名＋ブランド名を検索し、最も近い商品を返す
 */
async function searchRakuten(brandName: string, skuName: string): Promise<RakutenItem | null> {
  const keyword = encodeURIComponent(`${brandName} ${skuName}`.slice(0, 80));
  const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706`
    + `?applicationId=${APP_ID}&keyword=${keyword}&hits=5&sort=standard&format=json`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("  ⚠ API rate limit - 10秒待機...");
        await sleep(10000);
      }
      return null;
    }
    const json = await res.json() as { Items?: { Item: RakutenItem }[] };
    if (!json.Items?.length) return null;

    // 最初のヒットを採用（ブランド名が商品名に含まれるものを優先）
    const normalizedBrand = brandName.toLowerCase().replace(/\s/g, "");
    const matched = json.Items.find(({ Item }) =>
      Item.itemName.toLowerCase().replace(/\s/g, "").includes(normalizedBrand)
    );
    return (matched ?? json.Items[0]).Item;
  } catch {
    return null;
  }
}

/** itemCaption から catchCopy を抽出（最初の意味のある文） */
function extractCatchCopy(caption: string): string {
  if (!caption) return "";
  const decoded = decodeEntities(caption.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  // 最初の100文字以内の文を取得
  const first = decoded.split(/[。！？\n]/)[0].trim();
  if (first.length >= 10 && first.length <= 200) return first;
  return decoded.slice(0, 150).trim();
}

async function main() {
  const { limit, offset, refetch } = parseArgs();

  const where = refetch ? {} : {
    OR: [
      { catchCopy: null },
      { price: null },
    ],
  };

  const skus = await prisma.sKU.findMany({
    where,
    include: { brand: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

  console.log(`対象 SKU: ${skus.length} 件 (offset=${offset}${refetch ? ", --refetch" : ""})`);
  console.log(`楽天API applicationId: ${APP_ID!.slice(0, 8)}...`);
  console.log();

  let updated = 0;
  let apiHit = 0;

  for (const [idx, sku] of skus.entries()) {
    process.stdout.write(`  [${idx + 1}/${skus.length}] ${sku.name.slice(0, 35).padEnd(35)} `);

    const item = await searchRakuten(sku.brand.name, sku.name);

    const patch: Record<string, any> = { lastCrawledAt: new Date() };

    if (item) {
      apiHit++;
      if (!sku.catchCopy && item.itemCaption) {
        const copy = extractCatchCopy(item.itemCaption);
        if (copy) patch.catchCopy = copy;
      }
      if (!sku.price && item.itemPrice >= 500 && item.itemPrice <= 150000) {
        patch.price = item.itemPrice;
      }
      if (!sku.imageUrl && item.mediumImageUrls?.[0]?.imageUrl) {
        patch.imageUrl = item.mediumImageUrls[0].imageUrl;
      }
      if (!sku.productUrl && item.itemUrl) {
        patch.productUrl = item.itemUrl;
      }
      if (/医薬部外品|薬用/.test(item.itemCaption ?? "")) {
        patch.isQuasiDrug = true;
      }
    }

    await prisma.sKU.update({ where: { id: sku.id }, data: patch });
    updated++;

    const fields = Object.keys(patch).filter((k) => k !== "lastCrawledAt");
    console.log(item ? `✓ ${fields.join(", ") || "API hit/no new fields"}` : "skip (no hit)");

    await sleep(DELAY_MS);
  }

  console.log(`\n完了: ${updated} 件処理 / API ヒット ${apiHit} 件`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
