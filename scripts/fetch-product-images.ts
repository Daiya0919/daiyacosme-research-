/**
 * scripts/fetch-product-images.ts
 *
 * 各 SKU の楽天市場検索結果ページをフェッチし、最初の商品の
 *   - サムネイル画像URL (thumbnail.image.rakuten.co.jp/...)
 *   - 商品ページURL (item.rakuten.co.jp/{shop}/{item})
 * を抽出して SKU.imageUrl / SKU.productUrl を上書きする。
 *
 * 実行: npx tsx scripts/fetch-product-images.ts
 *
 * 注意:
 *  - User-Agent を付け、各リクエスト間に 1.5 秒のディレイ（楽天への負荷配慮）
 *  - 1件目の商品が必ず正解とは限らないが、検索の関連順なので大半は妥当
 *  - 結果が怪しいSKUは Admin から手動で imageUrl を上書き可能
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const RX_THUMB = /https:\/\/thumbnail\.image\.rakuten\.co\.jp\/[^"\s<>]+\.(?:jpg|jpeg|png|webp)/i;
const RX_ITEM = /https:\/\/item\.rakuten\.co\.jp\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;

async function fetchFirstProduct(brand: string, name: string) {
  const query = encodeURIComponent(`${brand} ${name}`);
  const url = `https://search.rakuten.co.jp/search/mall/${query}/`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const html = await res.text();

  const imageMatch = html.match(RX_THUMB);
  const itemMatch = html.match(RX_ITEM);

  // _ex= サイズ指定があれば 300x300 にして見栄え統一（Rakutenは末尾にクエリで効く）
  let imageUrl = imageMatch?.[0];
  if (imageUrl && !imageUrl.includes("?_ex=")) {
    imageUrl = `${imageUrl}?_ex=300x300`;
  }

  return {
    imageUrl,
    productUrl: itemMatch?.[0],
    searchUrl: url,
  };
}

async function main() {
  const skus = await prisma.sKU.findMany({ include: { brand: true } });
  console.log(`Fetching for ${skus.length} SKUs...`);

  let ok = 0;
  let warned = 0;
  let failed = 0;

  for (const sku of skus) {
    try {
      const r = await fetchFirstProduct(sku.brand.name, sku.name);
      const data: { imageUrl?: string; productUrl?: string } = {};
      if (r.imageUrl) data.imageUrl = r.imageUrl;
      if (r.productUrl) data.productUrl = r.productUrl;

      if (Object.keys(data).length > 0) {
        await prisma.sKU.update({ where: { id: sku.id }, data });
        ok++;
        console.log(`✓ ${sku.brand.name} / ${sku.name}`);
        if (r.imageUrl) console.log(`    img: ${r.imageUrl}`);
        if (r.productUrl) console.log(`    url: ${r.productUrl}`);
      } else {
        warned++;
        console.log(`⚠ ${sku.brand.name} / ${sku.name} — no match in search HTML`);
      }
    } catch (e) {
      failed++;
      console.error(`✗ ${sku.brand.name} / ${sku.name} — ${(e as Error).message}`);
    }
    // 楽天への負荷配慮
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nDone. ok=${ok} warned=${warned} failed=${failed}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
