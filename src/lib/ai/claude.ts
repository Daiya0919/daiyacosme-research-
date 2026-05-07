import type { AiProvider, SkuAnalysisInput, SkuAnalysisOutput, MarketTrendInput, MarketTrendOutput } from "./types";

/**
 * ClaudeAiProvider — Anthropic Messages API を直接 fetch で呼ぶ最小実装。
 * 本番採用時は @anthropic-ai/sdk への置き換えと、prompt cache, batch化を推奨。
 */
export class ClaudeAiProvider implements AiProvider {
  readonly name = "claude";
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "claude-sonnet-4-6",
  ) {}

  private async call(system: string, user: string): Promise<string> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => "")}`);
    const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
  }

  async analyzeSku(input: SkuAnalysisInput): Promise<SkuAnalysisOutput> {
    const sys = `あなたは化粧品市場の戦略リサーチャーです。OEM・商品開発・ブランド投資の意思決定に使う「なぜ売れているか」「次に何を作るべきか」を、定量データから構造化して書き出してください。出力は厳密にJSONのみ。`;
    const user = JSON.stringify({
      task: "analyze_sku",
      schema: {
        whySelling: "string",
        whoFits: "string",
        trendOrClassic: "trend|classic|both|unknown",
        developmentHint: "string",
        marketGap: "string",
      },
      input,
    });
    const text = await this.call(sys, user);
    return safeJson(text) as SkuAnalysisOutput;
  }

  async analyzeMarketTrend(input: MarketTrendInput): Promise<MarketTrendOutput> {
    const sys = `あなたは日本の化粧品市場のシニアアナリスト。年度別の受賞推移を読み、市場機会と空白領域を抽出する。出力は厳密にJSONのみ。`;
    const user = JSON.stringify({
      task: "analyze_market_trend",
      schema: {
        yearlyShift: "string", categoryGrowth: "string", koreanRatio: "string",
        ingredientTrend: "string", concernTrend: "string", developmentSuggestion: "string",
      },
      input,
    });
    const text = await this.call(sys, user);
    return safeJson(text) as MarketTrendOutput;
  }
}

function safeJson(text: string): unknown {
  // ```json ... ``` で囲まれていることがあるので剥がす
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = m ? m[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // 中括弧で囲まれた最大ブロックを抽出
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("Claude returned non-JSON: " + raw.slice(0, 200));
  }
}
