/**
 * scripts/fetch-sku-details.ts
 *
 * @cosme 商品ページ・楽天市場から以下を補填:
 *  - catchCopy（訴求文・キャッチコピー）
 *  - effects（効果効能 JSON配列）
 *  - ingredients（成分 JSON配列 ※既存を上書き）
 *  - spf / pa（日焼け止め指標）
 *  - isQuasiDrug（医薬部外品/薬用フラグ）
 *  - countryOfManufacture（製造国）
 *  - factoryName（製造工場名）
 *  - colorVariations（カラーバリエーション JSON配列）
 *  - season（夏/冬/両方の推定）
 *  - imageUrl / productUrl / price（楽天から補完）
 *  - lastCrawledAt（取得日時）
 *
 * 実行: npx tsx scripts/fetch-sku-details.ts [--limit=100] [--offset=0] [--refetch]
 *
 * --refetch: lastCrawledAt が設定済みでも再取得する
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELAY_MS = 1500;

/** HTMLエンティティを文字に戻す */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, "");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const limit  = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1]  ?? "100");
  const offset = parseInt(args.find((a) => a.startsWith("--offset="))?.split("=")[1] ?? "0");
  const refetch = args.includes("--refetch");
  return { limit, offset, refetch };
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0",
        "Accept-Language": "ja,en-US;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ==================== @cosme 商品ページパーサ ====================

function extractAtcosme(html: string, skuName: string) {
  const result: Partial<{
    catchCopy: string;
    effects: string[];
    ingredients: string[];
    spf: number;
    pa: string;
    isQuasiDrug: boolean;
    countryOfManufacture: string;
    factoryName: string;
    colorVariations: string[];
    season: string;
  }> = {};

  // キャッチコピー（商品説明の冒頭）
  const catchMatch = html.match(/<meta name="description" content="([^"]{10,200})"/);
  if (catchMatch) result.catchCopy = decodeEntities(catchMatch[1].replace(/\s+/g, " ").trim());

  // 医薬部外品
  if (/医薬部外品|薬用/.test(html)) result.isQuasiDrug = true;

  // SPF/PA
  const spfMatch = html.match(/SPF\s*(\d+)/i);
  if (spfMatch) result.spf = parseInt(spfMatch[1]);
  const paMatch = html.match(/(PA\+{1,4})/i);
  if (paMatch) result.pa = paMatch[1].toUpperCase();

  // 製造国
  const countryMatch = html.match(/製造国[：:]\s*([^\s<,、]{2,20})/);
  if (countryMatch) result.countryOfManufacture = countryMatch[1].trim();

  // 製造工場
  const factoryMatch = html.match(/製造(?:工場|販売|元)[：:]\s*([^\s<]{2,50})/);
  if (factoryMatch) result.factoryName = factoryMatch[1].trim();

  // 全成分
  const ingredientSection = html.match(/全成分[^<]*<[^>]+>([^<]{20,2000})/);
  if (ingredientSection) {
    const raw = ingredientSection[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const items = raw.split(/[、,，・\s]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 30);
    if (items.length > 3) result.ingredients = items.slice(0, 30);
  }

  // 効果効能（efficacy/効能欄）
  const efficacyMatch = html.match(/(?:効能|効果|期待できる効果)[^<]*<[^>]+>([^<]{10,300})/);
  if (efficacyMatch) {
    const raw = efficacyMatch[1].replace(/<[^>]+>/g, " ");
    const items = raw.split(/[、・,\n]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 20);
    if (items.length > 0) result.effects = items.slice(0, 10);
  }

  // カラーバリエーション
  const colorMatches = html.match(/#?[A-Fa-f0-9]{6}|(?:ピンク|レッド|ベージュ|オレンジ|ブラウン|ホワイト|ブラック|コーラル|ローズ|ヌード|テラコッタ)/g);
  if (colorMatches && colorMatches.length > 1) {
    result.colorVariations = Array.from(new Set(colorMatches)).slice(0, 12);
  }

  // 季節推定（商品名・説明文から）
  const text = skuName + " " + html.slice(0, 3000);
  const isSummer = /UV|日焼け止め|サンスクリーン|夏|冷感|さっぱり/.test(text);
  const isWinter = /保湿|乾燥|しっとり|冬|温感|バリア機能/.test(text);
  if (isSummer && isWinter) result.season = "both";
  else if (isSummer)        result.season = "summer";
  else if (isWinter)        result.season = "winter";

  return result;
}

// ==================== 楽天市場 商品ページパーサ ====================

function extractRakuten(html: string) {
  const result: Partial<{
    imageUrl: string;
    productUrl: string;
    price: number;
    catchCopy: string;
    isQuasiDrug: boolean;
    spf: number;
    pa: string;
    countryOfManufacture: string;
  }> = {};

  // 価格: カンマ区切り対応・500円未満は誤抽出とみなす
  const priceMatches = [...html.matchAll(/([\d,]{3,8})\s*(?:円|税込)/g)]
    .map((m) => parseInt(m[1].replace(/,/g, "")))
    .filter((p) => p >= 500 && p <= 150000);
  if (priceMatches.length > 0) result.price = priceMatches[0];

  // 画像
  const imgMatch = html.match(/thumbnail\.image\.rakuten\.co\.jp\/[^"']+\.jpg/);
  if (imgMatch) result.imageUrl = `https://${imgMatch[0]}`;

  // キャッチコピー
  const descMatch = html.match(/<meta name="description" content="([^"]{10,200})"/);
  if (descMatch) result.catchCopy = decodeEntities(descMatch[1].replace(/\s+/g, " ").trim());

  // 医薬部外品
  if (/医薬部外品|薬用/.test(html)) result.isQuasiDrug = true;

  // SPF/PA
  const spfMatch = html.match(/SPF\s*(\d+)/i);
  if (spfMatch) result.spf = parseInt(spfMatch[1]);
  const paMatch = html.match(/(PA\+{1,4})/i);
  if (paMatch) result.pa = paMatch[1].toUpperCase();

  // 製造国
  const countryMatch = html.match(/製造国[：:]\s*([^\s<,、]{2,20})/);
  if (countryMatch) result.countryOfManufacture = countryMatch[1].trim();

  return result;
}

// ==================== メイン ====================

async function main() {
  const { limit, offset, refetch } = parseArgs();

  const where = refetch ? {} : { lastCrawledAt: null };
  const skus = await prisma.sKU.findMany({
    where,
    include: { brand: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

  console.log(`対象 SKU: ${skus.length} 件 (offset=${offset}, limit=${limit}${refetch ? ", --refetch" : ""})`);

  let updated = 0;
  for (const [idx, sku] of skus.entries()) {
    process.stdout.write(`  [${idx + 1}/${skus.length}] ${sku.name.slice(0, 30)} ... `);

    const patch: Record<string, any> = { lastCrawledAt: new Date() };

    // --- @cosme 商品ページ ---
    if (sku.productUrl && sku.productUrl.includes("cosme.net")) {
      const html = await fetchHtml(sku.productUrl);
      if (html) {
        const extracted = extractAtcosme(html, sku.name);
        if (extracted.catchCopy && !sku.catchCopy)      patch.catchCopy = extracted.catchCopy;
        if (extracted.effects?.length)                   patch.effects = JSON.stringify(extracted.effects);
        if (extracted.ingredients?.length)               patch.ingredients = JSON.stringify(extracted.ingredients);
        if (extracted.spf && !sku.spf)                   patch.spf = extracted.spf;
        if (extracted.pa && !sku.pa)                     patch.pa = extracted.pa;
        if (extracted.isQuasiDrug)                       patch.isQuasiDrug = true;
        if (extracted.countryOfManufacture && !sku.countryOfManufacture) patch.countryOfManufacture = extracted.countryOfManufacture;
        if (extracted.factoryName && !sku.factoryName)   patch.factoryName = extracted.factoryName;
        if (extracted.colorVariations?.length && sku.colorVariations === "[]") patch.colorVariations = JSON.stringify(extracted.colorVariations);
        if (extracted.season && !sku.season)             patch.season = extracted.season;
      }
    }

    // --- 楽天 商品ページ ---
    if (sku.productUrl && sku.productUrl.includes("rakuten")) {
      const html = await fetchHtml(sku.productUrl);
      if (html) {
        const extracted = extractRakuten(html);
        if (extracted.price && !sku.price)               patch.price = extracted.price;
        if (extracted.imageUrl && !sku.imageUrl)         patch.imageUrl = extracted.imageUrl;
        if (extracted.catchCopy && !sku.catchCopy)       patch.catchCopy = extracted.catchCopy;
        if (extracted.isQuasiDrug)                       patch.isQuasiDrug = true;
        if (extracted.spf && !sku.spf)                   patch.spf = extracted.spf;
        if (extracted.pa && !sku.pa)                     patch.pa = extracted.pa;
        if (extracted.countryOfManufacture && !sku.countryOfManufacture) patch.countryOfManufacture = extracted.countryOfManufacture;
      }
    }

    // --- 楽天検索（productUrl がない場合の画像・価格補完） ---
    if (!sku.imageUrl || !sku.price) {
      const query = encodeURIComponent(`${sku.brand.name} ${sku.name}`);
      const searchUrl = `https://search.rakuten.co.jp/search/mall/${query}/`;
      const html = await fetchHtml(searchUrl);
      if (html) {
        const extracted = extractRakuten(html);
        if (extracted.price && !sku.price)     patch.price = extracted.price;
        if (extracted.imageUrl && !sku.imageUrl) patch.imageUrl = extracted.imageUrl;
      }
    }

    await prisma.sKU.update({ where: { id: sku.id }, data: patch });
    updated++;
    console.log(`✓ (${Object.keys(patch).filter((k) => k !== "lastCrawledAt").join(", ") || "timestamp only"})`);

    await sleep(DELAY_MS);
  }

  console.log(`\n完了: ${updated} / ${skus.length} 件を更新`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
