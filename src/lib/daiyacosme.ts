/**
 * DaiyaCosme Award の再編集ロジック。
 * 既存アワード結果からスコアを再計算した上で、抽象的な軸で並び替えて
 * DaiyaCosme独自のランキングを作る。
 *
 * 各賞には人間可読な `formula`（選定の重み配分）を持たせ、
 * UIでカンバン列のヘッダにそのまま表示する。
 */

import type { PrismaClient, SKU as SKUType } from "@prisma/client";
import { asList } from "./utils";

export const DAIYACOSME_AWARDS = [
  {
    type: "OVERALL_GRAND",
    label: "総合大賞",
    description: "全アワード横断で最も強いSKU。受賞数 × 継続性 × 口コミ × EC × 専門家評価。",
    formula: "総合スコア順 (10軸の重み付き合計)",
  },
  {
    type: "TREND",
    label: "トレンド大賞",
    description: "直近で急上昇しているSKU。LIPS・楽天・SNS・韓国コスメ・新成分を重視。",
    formula: "トレンド × 1.3 + 口コミ × 0.5 + EC × 0.4 + 韓国コスメ補正 +8",
  },
  {
    type: "CLASSIC",
    label: "定番名品賞",
    description: "3年以上評価され続けているSKU。@cosme・美的・VOCE・MAQUIA継続を重視。",
    formula: "定番 × 1.3 + 専門家 × 0.5 + 受賞 × 0.5",
  },
  {
    type: "INGREDIENT",
    label: "成分評価賞",
    description: "レチノール・ナイアシンアミド・CICA・PDRN・ビタミンCなど成分価値が明確なSKU。",
    formula: "差別化 × 1.4 + 専門家 × 0.6 + 成分数 × 4",
  },
  {
    type: "CONCERN",
    label: "肌悩み解決賞",
    description: "乾燥・毛穴・くすみ・ニキビ・敏感肌・エイジングなどに対応するSKU。",
    formula: "肌悩み数 × 12 + 実測 × 0.6 + 口コミ × 0.5",
  },
  {
    type: "TONE",
    label: "肌カラー・メイク適性賞",
    description: "イエベ春／秋・ブルベ夏／冬、ナチュラル／韓国風／ツヤ／マットなどの適性。",
    formula: "肌カラー数 × 14 + 口コミ × 0.5 + トレンド × 0.4",
  },
  {
    type: "VALUE",
    label: "コスパ賞",
    description: "価格に対する性能が高いSKU。LDK・楽天・ドラスト系を重視。",
    formula: "実測 + EC × 0.7 + 価格帯ボーナス (¥1,500以下:+25 / ¥3,000以下:+18)",
  },
  {
    type: "EXPERT",
    label: "プロ評価賞",
    description: "VOCE・MAQUIA・美的・WWDの編集部・美容家評価が高いSKU。",
    formula: "専門家 × 1.4 + 定番 × 0.4",
  },
  {
    type: "EC",
    label: "ECヒット賞",
    description: "楽天・レビュー数・セット販売・リピート性が強いSKU。",
    formula: "EC × 1.5 + 口コミ × 0.5",
  },
  {
    type: "NEXTGEN",
    label: "次世代ブランド賞",
    description: "韓国コスメ・新興ブランド・SNS発・D2Cブランドなど。",
    formula: "韓国コスメ +35 / プレステージ -10 + トレンド + 新作補正 (2022年以降:+22)",
  },
] as const;

export type DaiyaCosmeAwardType = (typeof DAIYACOSME_AWARDS)[number]["type"];

type SkuFull = SKUType & {
  brand: { isKorean: boolean; isPrestige: boolean; isDepacos: boolean };
  awardResults: { year: number }[];
};

/**
 * 各表彰タイプごとに重み配分を変えてランキングを作る。
 * 単純なtotalScoreではなく、軸ごとに「強い角度」が違うSKUが選ばれるようにする。
 */
function rankByType(skus: SkuFull[], type: DaiyaCosmeAwardType): SkuFull[] {
  const score = (s: SkuFull): number => {
    switch (type) {
      case "OVERALL_GRAND":
        return s.totalScore;
      case "TREND":
        return s.trendScore * 1.3 + s.reviewPowerScore * 0.5 + s.ecPowerScore * 0.4 + (s.brand.isKorean ? 8 : 0);
      case "CLASSIC":
        return s.classicScore * 1.3 + s.expertScore * 0.5 + s.awardScore * 0.5;
      case "INGREDIENT":
        return s.differentiationScore * 1.4 + s.expertScore * 0.6 + asList(s.ingredients).length * 4;
      case "CONCERN":
        return asList(s.skinConcerns).length * 12 + s.testScore * 0.6 + s.reviewPowerScore * 0.5;
      case "TONE":
        return asList(s.skinTones).length * 14 + s.reviewPowerScore * 0.5 + s.trendScore * 0.4;
      case "VALUE":
        return s.testScore * 1.0 + s.ecPowerScore * 0.7 + priceValueBonus(s.price);
      case "EXPERT":
        return s.expertScore * 1.4 + s.classicScore * 0.4;
      case "EC":
        return s.ecPowerScore * 1.5 + s.reviewPowerScore * 0.5;
      case "NEXTGEN":
        return (s.brand.isKorean ? 35 : 0) + (s.brand.isPrestige ? -10 : 0) + s.trendScore * 1.0 + newishLaunchBonus(s.launchYear);
    }
  };
  return [...skus].sort((a, b) => score(b) - score(a));
}

function priceValueBonus(price: number | null) {
  if (price == null) return 0;
  if (price <= 1500) return 25;
  if (price <= 3000) return 18;
  if (price <= 6000) return 8;
  return 0;
}
function newishLaunchBonus(launchYear: number | null) {
  if (!launchYear) return 0;
  if (launchYear >= 2022) return 22;
  if (launchYear >= 2020) return 12;
  return 0;
}

function reasonFor(type: DaiyaCosmeAwardType, sku: SkuFull, rank: number): string {
  const yrs = new Set(sku.awardResults.map((r) => r.year));
  const ctn = [...yrs].sort().join(", ");
  switch (type) {
    case "OVERALL_GRAND":
      return `総合スコア${sku.totalScore}。受賞年:${ctn || "—"}。媒体横断と継続性のバランスが最も強い。`;
    case "TREND":
      return `直近のUGC・EC指標が高く、トレンドスコア${sku.trendScore}。${sku.brand.isKorean ? "韓国コスメ起点。" : ""}`;
    case "CLASSIC":
      return `定番スコア${sku.classicScore}・継続受賞${yrs.size}年。媒体横断で安定評価。`;
    case "INGREDIENT":
      return `差別化${sku.differentiationScore} / 成分: ${asList(sku.ingredients).slice(0, 3).join(" / ") || "—"}`;
    case "CONCERN":
      return `対応する肌悩み: ${asList(sku.skinConcerns).join(" / ") || "—"}。実測スコア${sku.testScore}。`;
    case "TONE":
      return `イエベ／ブルベ適性タグが揃っている。トレンド${sku.trendScore}。`;
    case "VALUE":
      return `価格帯と実測のバランス。テスト${sku.testScore} × EC${sku.ecPowerScore}。`;
    case "EXPERT":
      return `編集部・専門家評価${sku.expertScore}。継続性${sku.classicScore}。`;
    case "EC":
      return `EC実績${sku.ecPowerScore} × 口コミ${sku.reviewPowerScore}。リピート前提層に強い。`;
    case "NEXTGEN":
      return `${sku.brand.isKorean ? "韓国コスメ／" : ""}発売${sku.launchYear ?? "—"}年。トレンド${sku.trendScore}。`;
  }
}

/**
 * DaiyaCosme Ranking テーブルを再構築する。
 * 既存のレコードを削除し、各賞ごとに上位N件を投入する。
 */
export async function rebuildDaiyaCosmeRankings(prisma: PrismaClient, topN = 8) {
  await prisma.daiyaCosmeRanking.deleteMany();
  const skus = (await prisma.sKU.findMany({
    include: { brand: true, awardResults: true, category: true },
  })) as unknown as SkuFull[];

  for (const def of DAIYACOSME_AWARDS) {
    const sorted = rankByType(skus, def.type as DaiyaCosmeAwardType);
    const top = sorted.slice(0, topN);
    let r = 1;
    for (const s of top) {
      await prisma.daiyaCosmeRanking.create({
        data: {
          daiyaCosmeAwardType: def.type,
          rank: r,
          skuId: s.id,
          totalScore: s.totalScore,
          awardScore: s.awardScore,
          trendScore: s.trendScore,
          classicScore: s.classicScore,
          reviewPowerScore: s.reviewPowerScore,
          ecPowerScore: s.ecPowerScore,
          expertScore: s.expertScore,
          testScore: s.testScore,
          reason: reasonFor(def.type as DaiyaCosmeAwardType, s, r),
        },
      });
      r++;
    }
  }
}
