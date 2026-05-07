import type { AiProvider } from "./types";
import { MockAiProvider } from "./mock";
import { ClaudeAiProvider } from "./claude";
import { OpenAiAiProvider } from "./openai";

export * from "./types";

let _ai: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (_ai) return _ai;
  const name = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "anthropic":
    case "claude":
      _ai = new ClaudeAiProvider(
        process.env.ANTHROPIC_API_KEY ?? "",
        process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      );
      break;
    case "openai":
    case "gpt":
      _ai = new OpenAiAiProvider(
        process.env.OPENAI_API_KEY ?? "",
        process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      );
      break;
    case "mock":
    default:
      _ai = new MockAiProvider();
      break;
  }
  return _ai;
}
