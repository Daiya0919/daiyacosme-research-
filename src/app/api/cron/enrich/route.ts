import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron から呼ばれる: 毎日 02:00 JST
// CRON_SECRET 環境変数で保護

const DELAY_MS = 1200;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0",
        "Accept-Language": "ja,en-US;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractFromHtml(html: string, skuName: string) {
  const patch: Record<string, any> = {};

  if (/医薬部外品|薬用/.test(html)) patch.isQuasiDrug = true;

  const spfMatch = html.match(/SPF\s*(\d+)/i);
  if (spfMatch) patch.spf = parseInt(spfMatch[1]);
  const paMatch = html.match(/(PA\+{1,4})/i);
  if (paMatch) patch.pa = paMatch[1].toUpperCase();

  const countryMatch = html.match(/製造国[：:]\s*([^\s<,、]{2,20})/);
  if (countryMatch) patch.countryOfManufacture = countryMatch[1].trim();

  const descMatch = html.match(/<meta name="description" content="([^"]{10,200})"/);
  if (descMatch) patch.catchCopy = descMatch[1].replace(/\s+/g, " ").trim();

  const text = skuName + " " + html.slice(0, 2000);
  const isSummer = /UV|日焼け止め|サンスクリーン|夏|冷感|さっぱり/.test(text);
  const isWinter = /保湿|乾燥|しっとり|冬|温感|バリア機能/.test(text);
  if (isSummer && isWinter) patch.season = "both";
  else if (isSummer)        patch.season = "summer";
  else if (isWinter)        patch.season = "winter";

  return patch;
}

export async function GET(req: Request) {
  // Vercel Cron 認証
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const BATCH = 20; // 1回の Cron 実行で処理する件数（Vercel 無料枠: 10秒制限）

  const skus = await prisma.sKU.findMany({
    where: {
      productUrl: { not: null },
      OR: [
        { lastCrawledAt: null },
        { lastCrawledAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7日以上前
      ],
    },
    include: { brand: true },
    orderBy: [{ lastCrawledAt: "asc" }],
    take: BATCH,
  });

  const results: string[] = [];

  for (const sku of skus) {
    if (!sku.productUrl) continue;
    const html = await fetchHtml(sku.productUrl);
    if (!html) { results.push(`skip:${sku.id}`); continue; }

    const extracted = extractFromHtml(html, sku.name);
    const patch: Record<string, any> = { ...extracted, lastCrawledAt: new Date() };

    // 既存値があるフィールドは上書きしない
    if (sku.catchCopy)            delete patch.catchCopy;
    if (sku.spf)                  delete patch.spf;
    if (sku.pa)                   delete patch.pa;
    if (sku.season)               delete patch.season;
    if (sku.countryOfManufacture) delete patch.countryOfManufacture;

    await prisma.sKU.update({ where: { id: sku.id }, data: patch });
    results.push(`ok:${sku.id}`);
    await sleep(DELAY_MS);
  }

  return NextResponse.json({
    processed: results.length,
    results,
    at: new Date().toISOString(),
  });
}
