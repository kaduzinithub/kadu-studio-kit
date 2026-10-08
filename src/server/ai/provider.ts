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

export function getAIProviderChain(preferred?: string): Array<{ id: AIProviderId; provider: AIProvider }> {
  const configured = (process.env.AI_FALLBACK_PROVIDERS || "nvidia,openrouter,gemini,groq").split(",").map((v) => v.trim()).filter(Boolean);
  const ids = [preferred || process.env.AI_PROVIDER || "nvidia", ...configured] as AIProviderId[];
  const unique = [...new Set(ids)];
  const chain: Array<{ id: AIProviderId; provider: AIProvider }> = [];
  for (const id of unique) {
    try {
      chain.push({ id, provider: getAIProvider(id) });
    } catch (error) {
      console.warn("[AI] provider indisponível:", id, error instanceof Error ? error.message : error);
    }
  }
  return chain;
}

export async function generateWithFallback<T>(
  preferred: string | undefined,
  operation: (provider: AIProvider) => Promise<T>,
): Promise<T> {
  const chain = getAIProviderChain(preferred);
  if (!chain.length) throw new Error("Nenhum provider de IA está configurado.");
  const errors: string[] = [];
  for (const { id, provider } of chain) {
    try {
      console.info("[AI] tentando provider:", id);
      return await operation(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[AI] provider falhou:", id, message);
      errors.push(`${id}: ${message}`);
    }
  }
  throw new Error(`Todos os providers de IA falharam. ${errors.join(" | ")}`);
}

function required(name: string, label: string) {
  const value = process.env[name];
  if (!value) throw new Error(`A chave da ${label} ainda não foi configurada.`);
  return value;
}
