/**
 * scripts/fix-bad-data.ts
 *
 * 既存データの汚染を修正する一回限りのクリーンアップ:
 *  1. catchCopy に HTML エンティティ(&infin; 等)が残っている → デコードして上書き
 *  2. price が明らかに異常値(500円未満 or 150000円超) → NULL にリセット
 *
 * 実行: npx tsx scripts/fix-bad-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  // 1. HTMLエンティティを含む catchCopy を修正
  const withEntities = await prisma.sKU.findMany({
    where: { catchCopy: { contains: "&" } },
    select: { id: true, catchCopy: true },
  });
  console.log(`catchCopy HTMLエンティティ汚染: ${withEntities.length} 件`);

  let fixedCatch = 0;
  for (const sku of withEntities) {
    if (!sku.catchCopy) continue;
    const decoded = decodeEntities(sku.catchCopy);
    if (decoded !== sku.catchCopy) {
      await prisma.sKU.update({ where: { id: sku.id }, data: { catchCopy: decoded } });
      fixedCatch++;
    }
  }
  console.log(`  → ${fixedCatch} 件を修正`);

  // 2. 異常価格 (500円未満 または 150000円超) を NULL にリセット
  const badPrice = await prisma.sKU.updateMany({
    where: {
      OR: [
        { price: { lt: 500 } },
        { price: { gt: 150000 } },
      ],
    },
    data: { price: null },
  });
  console.log(`異常価格リセット: ${badPrice.count} 件`);

  await prisma.$disconnect();
  console.log("完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
