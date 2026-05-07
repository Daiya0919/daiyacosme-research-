import type { AiProvider, SkuAnalysisInput, SkuAnalysisOutput, MarketTrendInput, MarketTrendOutput } from "./types";

export class OpenAiAiProvider implements AiProvider {
  readonly name = "openai";
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini",
  ) {}

  private async call(system: string, user: string): Promise<string> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not set");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content ?? "{}";
  }

  async analyzeSku(input: SkuAnalysisInput): Promise<SkuAnalysisOutput> {
    const sys = `あなたは化粧品OEMの商品企画レビュアー。出力はJSONのみ。`;
    const user = JSON.stringify({ task: "analyze_sku", input });
    return JSON.parse(await this.call(sys, user)) as SkuAnalysisOutput;
  }

  async analyzeMarketTrend(input: MarketTrendInput): Promise<MarketTrendOutput> {
    const sys = `あなたは日本の化粧品市場のアナリスト。出力はJSONのみ。`;
    const user = JSON.stringify({ task: "analyze_market_trend", input });
    return JSON.parse(await this.call(sys, user)) as MarketTrendOutput;
  }
}
