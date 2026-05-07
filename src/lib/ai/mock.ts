import type { AiProvider, SkuAnalysisInput, SkuAnalysisOutput, MarketTrendInput, MarketTrendOutput } from "./types";

/**
 * MockAiProvider:
 * APIキー無しでも動くように、入力データから決定論的に分析文を組み立てる。
 * 本番では Anthropic / OpenAI provider に切り替える。
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async analyzeSku(input: SkuAnalysisInput): Promise<SkuAnalysisOutput> {
    const yrs = new Set(input.awards.map((a) => a.year));
    const continuity = [...yrs].length;
    const recent = input.awards.filter((a) => a.year >= 2024).length;
    const expertHits = input.awards.filter((a) => /VOCE|MAQUIA|美的|WWD/.test(a.awardName)).length;
    const ugcHits = input.awards.filter((a) => /@cosme|LIPS/.test(a.awardName)).length;

    const trendOrClassic =
      continuity >= 3 && recent >= 1 ? "both" :
      continuity >= 3 ? "classic" :
      recent >= 2 ? "trend" : "unknown";

    const whySelling =
      `${input.brand}「${input.name}」が選ばれている主因は次の3点。` +
      `(1) 受賞媒体の重みつき合計が高い（総合${input.scores.totalScore}）。` +
      `(2) ${ugcHits >= expertHits ? "クチコミ系媒体（@cosme/LIPS）" : "雑誌・専門家媒体（VOCE/MAQUIA/美的/WWD）"}での評価が厚い。` +
      `(3) ${input.ingredients.length ? "成分訴求（" + input.ingredients.slice(0, 3).join(" / ") + "）が機能している。" : "カテゴリ内で強いポジションを取っている。"}`;

    const whoFits =
      input.skinConcerns.length
        ? `肌悩みが「${input.skinConcerns.join(" / ")}」に寄っている層に刺さる。`
        : `カテゴリの定番として、特定悩みに偏らない汎用層に推奨できる。`;

    const developmentHint =
      `OEM観点では、` +
      `${input.scores.testScore >= 60 ? "実測テストで通用する基剤強度" : "テクスチャ・使用感"}` +
      `を最低ラインに置き、` +
      `${input.scores.differentiationScore >= 60 ? "成分シグネチャを明確に" : "成分訴求の差別化点を1つ"}` +
      `添える方針が再現性が高い。価格は${guessPriceBand(input)}が勝ち筋。`;

    const marketGap =
      `${input.category}×${input.skinConcerns[0] ?? "敏感肌"}×プチプラ帯はまだ空白がある。同じスコアセットで価格を1段下げたSKUに勝ち筋。`;

    return { whySelling, whoFits, trendOrClassic, developmentHint, marketGap };
  }

  async analyzeMarketTrend(input: MarketTrendInput): Promise<MarketTrendOutput> {
    const totalKor = input.byYear.reduce((a, b) => a + b.korean, 0);
    const totalAll = input.byYear.reduce((a, b) => a + b.count, 0) || 1;
    const korRatio = Math.round((totalKor / totalAll) * 100);
    const top = input.topIngredients.slice(0, 3).map((x) => x.ingredient).join(", ") || "—";
    const concern = input.topConcerns.slice(0, 3).map((x) => x.concern).join(", ") || "—";

    return {
      yearlyShift: `2021→2025で受賞SKUの構成が変化。新興ブランド比率が上昇傾向、雑誌系の影響力は維持。`,
      categoryGrowth: `スキンケア寄りが安定。リップ・アイ系は短期トレンドが強くLIPS主導の入れ替わりが多い。`,
      koreanRatio: `韓国コスメ比率の概算: ${korRatio}%`,
      ingredientTrend: `主要成分: ${top}`,
      concernTrend: `主要肌悩み: ${concern}`,
      developmentSuggestion: `空白領域: 敏感肌×差別化成分×中価格帯（¥3,000-¥6,000）の単機能集中SKU。`,
    };
  }
}

function guessPriceBand(input: SkuAnalysisInput): string {
  const tot = input.scores.totalScore;
  if (tot >= 75) return "¥4,000-¥12,000";
  if (tot >= 55) return "¥1,500-¥4,000";
  return "¥800-¥2,500";
}
