/**
 * scripts/fetch-korean-names.ts
 *
 * isKorean=true のブランドに属する SKU の韓国語商品名を
 * Naver Shopping / Google 検索から取得して nameKorean に保存する。
 *
 * 実行: npx tsx scripts/fetch-korean-names.ts [--limit=50]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELAY_MS = 1800;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0",
        "Accept-Language": "ko-KR,ko;q=0.9,ja;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ハングルを含む文字列かどうか
function hasHangul(text: string): boolean {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(text);
}

// Google 検索結果から韓国語商品名を抽出する
async function findKoreanName(brandName: string, productName: string): Promise<string | null> {
  // Naver Shopping 検索
  const query = encodeURIComponent(`${brandName} ${productName}`);
  const naverUrl = `https://search.shopping.naver.com/search/all?query=${query}&cat_id=&frm=NVSHATC`;

  const html = await fetchHtml(naverUrl);
  if (html) {
    // Naver Shopping 商品タイトル候補
    const matches = html.match(/"productName":"([^"]{2,80})"/g);
    if (matches) {
      for (const m of matches) {
        const name = m.replace(/"productName":"/, "").replace(/"$/, "");
        if (hasHangul(name)) return name.trim();
      }
    }
    // OG タイトルから
    const ogMatch = html.match(/<title>([^<]{5,100})<\/title>/);
    if (ogMatch && hasHangul(ogMatch[1])) {
      return ogMatch[1].replace(/\s*[-|].*$/, "").trim();
    }
  }

  // フォールバック: Google 検索（韓国語ページ）
  const googleUrl = `https://www.google.co.kr/search?q=${query}+한국어&hl=ko&num=3`;
  const ghtml = await fetchHtml(googleUrl);
  if (ghtml) {
    const headings = ghtml.match(/<h3[^>]*>([^<]{4,80})<\/h3>/g);
    if (headings) {
      for (const h of headings) {
        const text = h.replace(/<[^>]+>/g, "").trim();
        if (hasHangul(text)) return text;
      }
    }
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "50");

  const skus = await prisma.sKU.findMany({
    where: {
      nameKorean: null,
      brand: { isKorean: true },
    },
    include: { brand: true },
    orderBy: { totalScore: "desc" },
    take: limit,
  });

  console.log(`韓国ブランド SKU (nameKorean 未設定): ${skus.length} 件`);

  let found = 0;
  for (const [idx, sku] of skus.entries()) {
    process.stdout.write(`  [${idx + 1}/${skus.length}] ${sku.name.slice(0, 30)} ... `);

    const koreanName = await findKoreanName(sku.brand.name, sku.name);
    if (koreanName) {
      await prisma.sKU.update({
        where: { id: sku.id },
        data: { nameKorean: koreanName, lastCrawledAt: new Date() },
      });
      found++;
      console.log(`✓ ${koreanName}`);
    } else {
      console.log("- 見つからず");
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n完了: ${found} / ${skus.length} 件に韓国語名を設定`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
