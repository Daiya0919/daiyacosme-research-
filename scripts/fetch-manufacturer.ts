/**
 * scripts/fetch-manufacturer.ts
 *
 * @cosme productUrl を持つ SKU について、商品ページの「メーカー」フィールドを
 * 製造販売元（法人名）として取得し SKU.manufacturerName / manufacturerUrl に保存。
 *
 * @cosme 商品ページは Shift_JIS。HTML構造:
 *   <dl class="maker clearfix">
 *     <dt>メーカー</dt>
 *     <dd><a href="https://www.cosme.net/maker/maker_id/191">資生堂インターナショナル</a></dd>
 *   </dl>
 *
 * 実行: DATABASE_URL=... npx tsx scripts/fetch-manufacturer.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, x) => String.fromCharCode(parseInt(x, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
}

async function fetchCosmeMaker(url: string): Promise<{ name: string; makerUrl: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("shift_jis").decode(new Uint8Array(buf));
    // <dl class="maker clearfix"><dt>メーカー</dt><dd><a href="...">NAME</a></dd></dl>
    const m = html.match(
      /<dl class=["']maker[^"']*["']>\s*<dt>メーカー<\/dt>\s*<dd>\s*<a href=["']([^"']+)["'][^>]*>\s*([^<]+?)\s*<\/a>/,
    );
    if (!m) return null;
    return { makerUrl: m[1], name: decodeEntities(m[2]).trim() };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  const skus = await prisma.sKU.findMany({
    where: { productUrl: { contains: "cosme.net" } },
    select: { id: true, name: true, productUrl: true, manufacturerName: true },
  });
  console.log(`${skus.length} SKUs to process`);

  let ok = 0;
  let updated = 0;
  let failed = 0;
  let notFound = 0;
  const makerCounts: Record<string, number> = {};

  let i = 0;
  for (const sku of skus) {
    i++;
    const result = await fetchCosmeMaker(sku.productUrl!);
    if (!result) {
      notFound++;
      if (i % 20 === 0) console.log(`  [${i}/${skus.length}] ok=${ok} updated=${updated} notFound=${notFound} failed=${failed}`);
      await sleep(1200);
      continue;
    }
    ok++;
    makerCounts[result.name] = (makerCounts[result.name] ?? 0) + 1;
    if (sku.manufacturerName !== result.name) {
      await prisma.sKU.update({
        where: { id: sku.id },
        data: { manufacturerName: result.name, manufacturerUrl: result.makerUrl },
      });
      updated++;
    }
    if (i % 20 === 0) {
      console.log(`  [${i}/${skus.length}] ok=${ok} updated=${updated} notFound=${notFound} failed=${failed}`);
    }
    await sleep(1200);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Processed: ${i} / ${skus.length}`);
  console.log(`Manufacturer found: ${ok}`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nTop 20 manufacturers:`);
  const sorted = Object.entries(makerCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [n, c] of sorted) console.log(`  ${c.toString().padStart(4)} ${n}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
