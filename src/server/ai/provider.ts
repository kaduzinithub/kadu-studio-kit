import type { AIProvider } from "./types";
import { NvidiaNimProvider } from "./nvidia";
import { AnthropicProvider, GeminiProvider, OpenAICompatibleProvider } from "./providers";

export type AIProviderId = "nvidia" | "openai" | "openrouter" | "anthropic" | "gemini" | "groq";

export const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  nvidia: "NVIDIA NIM",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
  groq: "Groq",
};

export function getAIProvider(id = process.env.AI_PROVIDER || "nvidia"): AIProvider {
  switch (id as AIProviderId) {
    case "openai":
      return new OpenAICompatibleProvider(
        required("OPENAI_API_KEY", "OpenAI"),
        process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions",
        process.env.OPENAI_MODEL || "gpt-5.4",
        "OpenAI",
      );
    case "openrouter":
      return new OpenAICompatibleProvider(
        required("OPENROUTER_API_KEY", "OpenRouter"),
        "https://openrouter.ai/api/v1/chat/completions",
        process.env.OPENROUTER_MODEL || "openai/gpt-5.4",
        "OpenRouter",
      );
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new OpenAICompatibleProvider(
        required("GROQ_API_KEY", "Groq"),
        "https://api.groq.com/openai/v1/chat/completions",
        process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        "Groq",
      );
    case "nvidia":
    default:
      return new NvidiaNimProvider();
  }
}

function required(name: string, label: string) {
  const value = process.env[name];
  if (!value) throw new Error(`A chave da ${label} ainda não foi configurada.`);
  return value;
}
