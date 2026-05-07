/**
 * prisma/seed.ts
 *
 * 起動方法: pnpm db:seed
 *
 * このファイルは「Web検索が完成する前にUI/DB/スコアリングが完全に動く」状態を作るための
 * リアルなダミーデータです。商品名・ブランド名は実在するものを参考にしていますが、
 * 受賞順位や数字はサンプル値です。実運用ではsrc/lib/search経由で上書きしてください。
 */

import { PrismaClient } from "@prisma/client";
import { computeTotalScore, classifyTrendOrClassic } from "../src/lib/scoring";
import { rebuildDaiyaCosmeRankings } from "../src/lib/daiyacosme";
import { listToJson } from "../src/lib/utils";

// ---- 商品画像 / 販売ページ用ヘルパ ----
// 画像は placehold.co のブランドカラーつきプレースホルダ。
// 実画像URLが手に入った段階で Admin の updateSkuAction や別Jobで差し替え可能。
const BRAND_COLORS: Record<string, { bg: string; fg: string }> = {
  "ナチュリエ": { bg: "fef3c7", fg: "92400e" },
  "SK-II": { bg: "fee2e2", fg: "991b1b" },
  "ESTÉE LAUDER": { bg: "f3f4f6", fg: "111827" },
  "VT": { bg: "ecfeff", fg: "0e7490" },
  "Anua": { bg: "f0fdf4", fg: "166534" },
  "オペラ": { bg: "fce7f3", fg: "9d174d" },
  "rom&nd": { bg: "fef2f2", fg: "7c2d12" },
  "CLIO": { bg: "fdf4ff", fg: "86198f" },
  "ALBION": { bg: "f5f5f4", fg: "292524" },
  "DECORTÉ": { bg: "fdf2f8", fg: "831843" },
  "キュレル": { bg: "f0f9ff", fg: "0c4a6e" },
  "ミノン": { bg: "ecfeff", fg: "155e75" },
  "ケイト": { bg: "fafafa", fg: "0f172a" },
  "セザンヌ": { bg: "fef9c3", fg: "854d0e" },
  "資生堂": { bg: "fff7ed", fg: "7c2d12" },
  "uka": { bg: "fef9c3", fg: "92400e" },
  "&be": { bg: "fafaf9", fg: "1c1917" },
  "キャンメイク": { bg: "fce7f3", fg: "be185d" },
};
function imageUrlFor(brand: string, name: string): string {
  const c = BRAND_COLORS[brand] ?? { bg: "f4f4f5", fg: "27272a" };
  // 改行を含めると placehold.co が複数行で描画する。ブランド+商品の冒頭。
  const text = `${brand}\n${name.length > 14 ? name.slice(0, 13) + "…" : name}`;
  return `https://placehold.co/400x400/${c.bg}/${c.fg}/png?text=${encodeURIComponent(text)}`;
}
function productUrlFor(brand: string, name: string): string {
  // 楽天市場の検索結果URL。SKUによってAmazonや公式が良い場合は個別に上書きしてください。
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(brand + " " + name)}/`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ resetting...");
  await prisma.researchLog.deleteMany();
  await prisma.researchJob.deleteMany();
  await prisma.sKUAnalysis.deleteMany();
  await prisma.daiyaCosmeRanking.deleteMany();
  await prisma.source.deleteMany();
  await prisma.awardResult.deleteMany();
  await prisma.similarSKU.deleteMany();
  await prisma.sKU.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.award.deleteMany();

  // ---------- アワード ----------
  const awards = await Promise.all(
    [
      { name: "@cosmeベストコスメアワード", slug: "atcosme", mediaType: "ugc", weight: 1.2, description: "@cosme（アットコスメ）の総合アワード。クチコミ強い。" },
      { name: "LIPSベストコスメ", slug: "lips", mediaType: "ugc", weight: 1.1, description: "若年層・SNSトレンドの代表指標。" },
      { name: "VOCE BEST COSMETICS", slug: "voce", mediaType: "magazine", weight: 1.1, description: "VOCE誌の編集部・美容家評価。" },
      { name: "MAQUIAベストコスメ", slug: "maquia", mediaType: "magazine", weight: 1.1, description: "MAQUIA誌の編集部・美容家評価。" },
      { name: "美的ベストコスメ", slug: "biteki", mediaType: "magazine", weight: 1.1, description: "美的のベストコスメ。" },
      { name: "LDK the Beauty", slug: "ldk", mediaType: "test_lab", weight: 1.3, description: "実測テスト主体（広告なし）。" },
      { name: "WWD Beautyベストコスメ", slug: "wwd", mediaType: "trade", weight: 1.0, description: "業界・専門家評価。" },
      { name: "楽天ベストコスメ", slug: "rakuten", mediaType: "ec", weight: 1.0, description: "EC販売実績ベース。" },
    ].map((d) => prisma.award.create({ data: d })),
  );
  const A = Object.fromEntries(awards.map((a) => [a.slug, a]));

  // ---------- カテゴリ ----------
  const categoriesDef = [
    "化粧水", "美容液", "乳液・クリーム", "クレンジング", "洗顔", "日焼け止め",
    "ファンデーション", "下地", "パウダー", "アイシャドウ", "アイライナー",
    "マスカラ", "チーク", "リップ", "ヘアケア", "ボディケア", "メンズコスメ",
  ];
  const categories = await Promise.all(
    categoriesDef.map((n, i) =>
      prisma.category.create({ data: { name: n, slug: slug(n), order: i } }),
    ),
  );
  const C = Object.fromEntries(categories.map((c) => [c.name, c]));

  // ---------- ブランド ----------
  const brandsDef: Array<{ name: string; isKorean?: boolean; isDepacos?: boolean; isPrestige?: boolean; country?: string }> = [
    { name: "資生堂", country: "JP", isPrestige: true },
    { name: "SK-II", country: "JP", isDepacos: true, isPrestige: true },
    { name: "ALBION", country: "JP", isDepacos: true, isPrestige: true },
    { name: "DECORTÉ", country: "JP", isDepacos: true, isPrestige: true },
    { name: "ESTÉE LAUDER", country: "US", isDepacos: true, isPrestige: true },
    { name: "LANCÔME", country: "FR", isDepacos: true, isPrestige: true },
    { name: "イプサ", country: "JP", isDepacos: true },
    { name: "ナチュリエ", country: "JP" },
    { name: "ミノン", country: "JP" },
    { name: "キュレル", country: "JP" },
    { name: "無印良品", country: "JP" },
    { name: "ハトムギ", country: "JP" },
    { name: "VT", country: "KR", isKorean: true },
    { name: "魅惑のティアラ", country: "KR", isKorean: true },
    { name: "Anua", country: "KR", isKorean: true },
    { name: "rom&nd", country: "KR", isKorean: true },
    { name: "CLIO", country: "KR", isKorean: true },
    { name: "オペラ", country: "JP" },
    { name: "ケイト", country: "JP" },
    { name: "セザンヌ", country: "JP" },
    { name: "キャンメイク", country: "JP" },
    { name: "&be", country: "JP" },
    { name: "uka", country: "JP" },
  ];
  const brands = await Promise.all(
    brandsDef.map((b) =>
      prisma.brand.create({
        data: { ...b, normalizedName: normalize(b.name) },
      }),
    ),
  );
  const B = Object.fromEntries(brands.map((b) => [b.name, b]));

  // ---------- SKU ----------
  type SkuSeed = {
    name: string;
    brand: string;
    category: string;
    price?: number;
    volume?: string;
    launchYear?: number;
    imageUrl?: string;
    ingredients?: string[];
    skinConcerns?: string[];
    skinTones?: string[];
    awards: Array<{ slug: string; year: number; awardCategory: string; rank?: number; comment?: string; reason?: string; sourceUrl?: string; sourceTitle?: string; reliability?: number }>;
    similarTo?: string[]; // SKU name
    needsReview?: boolean;
  };

  const skus: SkuSeed[] = [
    {
      name: "ナチュリエ ハトムギ化粧水",
      brand: "ナチュリエ",
      category: "化粧水",
      price: 715,
      volume: "500ml",
      launchYear: 2009,
      ingredients: ["ハトムギエキス", "グリセリン"],
      skinConcerns: ["乾燥", "ニキビ", "敏感肌"],
      skinTones: ["イエベ春", "イエベ秋", "ブルベ夏", "ブルベ冬"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "化粧水部門", rank: 3, comment: "リピート殿堂入り。たっぷり使えるコスパ。" },
        { slug: "atcosme", year: 2022, awardCategory: "化粧水部門", rank: 2 },
        { slug: "atcosme", year: 2023, awardCategory: "化粧水部門", rank: 4 },
        { slug: "rakuten", year: 2022, awardCategory: "化粧水部門", rank: 1 },
        { slug: "rakuten", year: 2023, awardCategory: "化粧水部門", rank: 1 },
        { slug: "ldk", year: 2024, awardCategory: "プチプラ化粧水", rank: 1, comment: "実測テストで保湿持続が高評価。" },
      ],
    },
    {
      name: "SK-II フェイシャルトリートメントエッセンス",
      brand: "SK-II",
      category: "美容液",
      price: 22000,
      volume: "230ml",
      launchYear: 1980,
      ingredients: ["ピテラ", "ガラクトミセス発酵液"],
      skinConcerns: ["くすみ", "エイジング", "キメ"],
      awards: [
        { slug: "voce", year: 2021, awardCategory: "美容液部門", rank: 1 },
        { slug: "maquia", year: 2022, awardCategory: "美容液部門", rank: 2 },
        { slug: "biteki", year: 2023, awardCategory: "美容液", rank: 1 },
        { slug: "voce", year: 2024, awardCategory: "美容液", rank: 2 },
        { slug: "wwd", year: 2024, awardCategory: "プレステージスキンケア", rank: 1 },
      ],
    },
    {
      name: "ESTÉE LAUDER アドバンス ナイト リペア",
      brand: "ESTÉE LAUDER",
      category: "美容液",
      price: 12100,
      volume: "30ml",
      launchYear: 1982,
      ingredients: ["ナイアシンアミド", "ヒアルロン酸", "ビフィズス菌発酵液"],
      skinConcerns: ["エイジング", "くすみ", "乾燥"],
      awards: [
        { slug: "voce", year: 2021, awardCategory: "美容液部門", rank: 2 },
        { slug: "maquia", year: 2023, awardCategory: "美容液部門", rank: 1 },
        { slug: "biteki", year: 2024, awardCategory: "美容液", rank: 1 },
        { slug: "atcosme", year: 2024, awardCategory: "美容液部門", rank: 5 },
      ],
    },
    {
      name: "VT CICA デイリースージングマスク",
      brand: "VT",
      category: "美容液",
      price: 1980,
      volume: "30枚",
      launchYear: 2018,
      ingredients: ["CICA", "マデカソサイド"],
      skinConcerns: ["敏感肌", "赤み", "ニキビ"],
      awards: [
        { slug: "lips", year: 2022, awardCategory: "シートマスク", rank: 1 },
        { slug: "lips", year: 2023, awardCategory: "シートマスク", rank: 1 },
        { slug: "rakuten", year: 2024, awardCategory: "韓国コスメ部門", rank: 2 },
        { slug: "atcosme", year: 2024, awardCategory: "シートマスク部門", rank: 3 },
      ],
    },
    {
      name: "Anua ドクダミ77% スージングトナー",
      brand: "Anua",
      category: "化粧水",
      price: 2860,
      volume: "250ml",
      launchYear: 2021,
      ingredients: ["ドクダミエキス", "PHA"],
      skinConcerns: ["敏感肌", "赤み", "毛穴"],
      awards: [
        { slug: "lips", year: 2023, awardCategory: "化粧水部門", rank: 1, comment: "韓国コスメで急上昇。" },
        { slug: "lips", year: 2024, awardCategory: "化粧水部門", rank: 1 },
        { slug: "rakuten", year: 2024, awardCategory: "韓国コスメ部門", rank: 1 },
        { slug: "atcosme", year: 2024, awardCategory: "化粧水部門", rank: 7 },
      ],
    },
    {
      name: "オペラ リップティント N",
      brand: "オペラ",
      category: "リップ",
      price: 1650,
      volume: "—",
      launchYear: 2017,
      ingredients: ["ポリイソブテン", "ティント処方"],
      skinConcerns: [],
      skinTones: ["イエベ春", "イエベ秋", "ブルベ夏"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "口紅部門", rank: 1 },
        { slug: "atcosme", year: 2022, awardCategory: "口紅部門", rank: 2 },
        { slug: "lips", year: 2023, awardCategory: "ティントリップ", rank: 2 },
        { slug: "biteki", year: 2024, awardCategory: "ティントリップ", rank: 3 },
      ],
    },
    {
      name: "rom&nd ジューシーラスティングティント",
      brand: "rom&nd",
      category: "リップ",
      price: 1320,
      volume: "—",
      launchYear: 2019,
      ingredients: ["ティント処方"],
      skinTones: ["イエベ秋", "ブルベ夏", "ブルベ冬"],
      awards: [
        { slug: "lips", year: 2022, awardCategory: "ティントリップ", rank: 1 },
        { slug: "lips", year: 2023, awardCategory: "ティントリップ", rank: 1 },
        { slug: "lips", year: 2024, awardCategory: "ティントリップ", rank: 1 },
        { slug: "rakuten", year: 2024, awardCategory: "リップ部門", rank: 3 },
      ],
    },
    {
      name: "CLIO プロアイパレット",
      brand: "CLIO",
      category: "アイシャドウ",
      price: 3850,
      volume: "0.6g x 10色",
      launchYear: 2019,
      skinTones: ["イエベ春", "イエベ秋", "ブルベ夏", "ブルベ冬"],
      awards: [
        { slug: "lips", year: 2022, awardCategory: "アイシャドウパレット", rank: 1 },
        { slug: "lips", year: 2023, awardCategory: "アイシャドウパレット", rank: 2 },
        { slug: "atcosme", year: 2023, awardCategory: "パウダーアイシャドウ", rank: 2 },
        { slug: "biteki", year: 2024, awardCategory: "韓国アイシャドウ", rank: 1 },
      ],
    },
    {
      name: "ALBION 薬用スキンコンディショナーエッセンシャル",
      brand: "ALBION",
      category: "化粧水",
      price: 5500,
      volume: "165ml",
      launchYear: 1974,
      ingredients: ["ハトムギ", "薬用美白"],
      skinConcerns: ["敏感肌", "ニキビ"],
      awards: [
        { slug: "voce", year: 2021, awardCategory: "化粧水部門", rank: 3 },
        { slug: "maquia", year: 2022, awardCategory: "化粧水部門", rank: 3 },
        { slug: "biteki", year: 2023, awardCategory: "化粧水", rank: 4 },
        { slug: "atcosme", year: 2024, awardCategory: "化粧水部門", rank: 6 },
      ],
    },
    {
      name: "DECORTÉ リポソーム アドバンスト リペアセラム",
      brand: "DECORTÉ",
      category: "美容液",
      price: 13200,
      volume: "50ml",
      launchYear: 2022,
      ingredients: ["多重層リポソーム", "ヒアルロン酸"],
      skinConcerns: ["乾燥", "エイジング"],
      awards: [
        { slug: "voce", year: 2023, awardCategory: "美容液部門", rank: 1 },
        { slug: "maquia", year: 2024, awardCategory: "美容液部門", rank: 2 },
        { slug: "biteki", year: 2024, awardCategory: "美容液", rank: 2 },
        { slug: "wwd", year: 2024, awardCategory: "プレステージスキンケア", rank: 3 },
      ],
    },
    {
      name: "キュレル 潤浸保湿フェイスクリーム",
      brand: "キュレル",
      category: "乳液・クリーム",
      price: 2530,
      volume: "40g",
      launchYear: 2012,
      ingredients: ["セラミド機能成分"],
      skinConcerns: ["敏感肌", "乾燥"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "クリーム部門", rank: 4 },
        { slug: "atcosme", year: 2022, awardCategory: "クリーム部門", rank: 3 },
        { slug: "ldk", year: 2023, awardCategory: "敏感肌クリーム", rank: 1, comment: "実測で刺激なく保湿持続が長い。" },
        { slug: "biteki", year: 2024, awardCategory: "敏感肌スキンケア", rank: 2 },
      ],
    },
    {
      name: "ミノン アミノモイスト 薬用アクネケア ローション",
      brand: "ミノン",
      category: "化粧水",
      price: 2530,
      volume: "150ml",
      launchYear: 2020,
      ingredients: ["アミノ酸", "サリチル酸"],
      skinConcerns: ["敏感肌", "ニキビ"],
      awards: [
        { slug: "ldk", year: 2022, awardCategory: "敏感肌化粧水", rank: 1 },
        { slug: "atcosme", year: 2023, awardCategory: "化粧水部門", rank: 8 },
        { slug: "maquia", year: 2024, awardCategory: "敏感肌スキンケア", rank: 3 },
      ],
    },
    {
      name: "ケイト リップモンスター",
      brand: "ケイト",
      category: "リップ",
      price: 1540,
      volume: "—",
      launchYear: 2021,
      skinTones: ["イエベ秋", "ブルベ冬"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "口紅部門", rank: 2 },
        { slug: "atcosme", year: 2022, awardCategory: "口紅部門", rank: 1 },
        { slug: "lips", year: 2022, awardCategory: "口紅", rank: 2 },
        { slug: "rakuten", year: 2023, awardCategory: "リップ部門", rank: 1 },
        { slug: "biteki", year: 2023, awardCategory: "プチプラリップ", rank: 1 },
      ],
    },
    {
      name: "セザンヌ UVシルクカバーパウダー",
      brand: "セザンヌ",
      category: "パウダー",
      price: 990,
      volume: "10g",
      launchYear: 2020,
      skinConcerns: ["皮脂", "毛穴"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "プレストパウダー", rank: 1 },
        { slug: "atcosme", year: 2022, awardCategory: "プレストパウダー", rank: 2 },
        { slug: "ldk", year: 2023, awardCategory: "プチプラフェイスパウダー", rank: 1 },
        { slug: "rakuten", year: 2024, awardCategory: "ベースメイク", rank: 4 },
      ],
    },
    {
      name: "資生堂 アネッサ パーフェクトUVスキンケアミルクa",
      brand: "資生堂",
      category: "日焼け止め",
      price: 3300,
      volume: "60ml",
      launchYear: 2020,
      skinConcerns: ["日焼け", "乾燥"],
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "日焼け止め", rank: 1 },
        { slug: "atcosme", year: 2022, awardCategory: "日焼け止め", rank: 1 },
        { slug: "atcosme", year: 2023, awardCategory: "日焼け止め", rank: 2 },
        { slug: "ldk", year: 2024, awardCategory: "日焼け止め", rank: 2 },
        { slug: "biteki", year: 2024, awardCategory: "日焼け止め", rank: 1 },
      ],
    },
    {
      name: "uka スカルプブラシ ケンザン",
      brand: "uka",
      category: "ヘアケア",
      price: 2420,
      volume: "—",
      launchYear: 2014,
      awards: [
        { slug: "voce", year: 2022, awardCategory: "ヘアケアツール", rank: 1 },
        { slug: "maquia", year: 2023, awardCategory: "ヘアケアツール", rank: 1 },
      ],
    },
    {
      name: "&be ファンシーラー",
      brand: "&be",
      category: "下地",
      price: 3300,
      volume: "—",
      launchYear: 2021,
      skinConcerns: ["毛穴", "色ムラ"],
      awards: [
        { slug: "voce", year: 2022, awardCategory: "コンシーラー", rank: 1 },
        { slug: "biteki", year: 2023, awardCategory: "コンシーラー", rank: 2 },
        { slug: "lips", year: 2024, awardCategory: "コンシーラー", rank: 3 },
      ],
    },
    {
      name: "キャンメイク クイックラッシュカーラー",
      brand: "キャンメイク",
      category: "マスカラ",
      price: 748,
      volume: "—",
      launchYear: 2007,
      awards: [
        { slug: "atcosme", year: 2021, awardCategory: "マスカラ下地", rank: 1 },
        { slug: "atcosme", year: 2022, awardCategory: "マスカラ下地", rank: 1 },
        { slug: "ldk", year: 2023, awardCategory: "マスカラ下地", rank: 1 },
        { slug: "atcosme", year: 2024, awardCategory: "マスカラ下地", rank: 2 },
      ],
    },
  ];

  // SKU + AwardResult 投入
  const skuByName = new Map<string, string>();
  for (const s of skus) {
    const sku = await prisma.sKU.create({
      data: {
        name: s.name,
        normalizedName: normalize(s.name),
        brandId: B[s.brand].id,
        categoryId: C[s.category].id,
        price: s.price,
        volume: s.volume,
        launchYear: s.launchYear,
        imageUrl: s.imageUrl ?? imageUrlFor(s.brand, s.name),
        productUrl: productUrlFor(s.brand, s.name),
        ingredients: listToJson(s.ingredients),
        skinConcerns: listToJson(s.skinConcerns),
        skinTones: listToJson(s.skinTones),
        needsReview: !!s.needsReview,
      },
    });
    skuByName.set(s.name, sku.id);

    for (const a of s.awards) {
      const result = await prisma.awardResult.create({
        data: {
          awardId: A[a.slug].id,
          year: a.year,
          awardCategory: a.awardCategory,
          rank: a.rank,
          skuId: sku.id,
          comment: a.comment,
          reason: a.reason,
          confidenceScore: a.reliability ?? 0.85,
        },
      });
      await prisma.source.create({
        data: {
          url: a.sourceUrl ?? `https://example.com/${A[a.slug].slug}/${a.year}/${encodeURIComponent(a.awardCategory)}#${encodeURIComponent(s.name)}`,
          title: a.sourceTitle ?? `${A[a.slug].name} ${a.year} 受賞一覧 — ${s.name}`,
          awardId: A[a.slug].id,
          year: a.year,
          rawTextExcerpt: a.comment ?? null,
          reliability: a.reliability ?? 0.8,
          awardResultId: result.id,
        },
      });
    }
  }

  // ---------- スコアリング & 分類 ----------
  const allSkus = await prisma.sKU.findMany({
    include: { awardResults: { include: { award: true } } },
  });
  for (const sku of allSkus) {
    const { totalScore, ...sub } = computeTotalScore(sku, sku.awardResults);
    const trendOrClassic = classifyTrendOrClassic(sku.awardResults);
    await prisma.sKU.update({
      where: { id: sku.id },
      data: { ...sub, totalScore, trendOrClassic },
    });
  }

  // 類似SKU（同カテゴリ上位を相互リンク）
  const byCategory: Record<string, { id: string; totalScore: number }[]> = {};
  for (const s of await prisma.sKU.findMany({ select: { id: true, categoryId: true, totalScore: true } })) {
    (byCategory[s.categoryId] ||= []).push({ id: s.id, totalScore: s.totalScore });
  }
  for (const arr of Object.values(byCategory)) {
    arr.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < Math.min(arr.length, i + 3); j++) {
        await prisma.similarSKU.upsert({
          where: { fromId_toId: { fromId: arr[i].id, toId: arr[j].id } },
          update: {},
          create: { fromId: arr[i].id, toId: arr[j].id, reason: "同カテゴリ上位" },
        });
      }
    }
  }

  // ---------- AI分析（モック） ----------
  for (const sku of allSkus) {
    await prisma.sKUAnalysis.create({
      data: {
        skuId: sku.id,
        whySelling: `「${sku.name}」は複数アワード横断で受賞しており、特に媒体重みの高いアワードでの評価が継続している点が販売の継続性を支えている。`,
        whoFits: "肌悩みが明確かつ、リピート前提で買えるプライスゾーンを探している層。",
        trendOrClassic: sku.trendOrClassic,
        developmentHint: "受賞コメントに頻出する評価軸（保湿持続・テクスチャ・刺激の少なさ）をOEMの設計仕様に落とすと再現性が高い。",
        marketGap: "敏感肌×成分訴求×プチプラ帯はまだ空白が残る。",
        llmProvider: "mock",
      },
    });
  }

  // ---------- DaiyaCosme表彰 ----------
  await rebuildDaiyaCosmeRankings(prisma);

  console.log("✅ seed done.");
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[・/\s]+/g, "-")
    .replace(/[（）()]/g, "")
    .replace(/[^a-z0-9一-龯ぁ-んァ-ヶー\-]/g, "");
}

function normalize(s: string) {
  return s
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[!-/:-@[-`{-~]/g, "")
    .toLowerCase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
