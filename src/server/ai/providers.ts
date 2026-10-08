import { generatedProjectSchema, type GeneratedProject } from "./schemas";
import type { AIProvider, EditSiteInput, GenerateSiteInput } from "./types";

const SYSTEM = `Você é um web designer sênior. Responda APENAS com um objeto JSON válido, sem markdown, sem texto extra, no formato:
{"projectName":"kebab-case","title":"Título","files":[{"path":"index.html","content":"..."},{"path":"styles.css","content":"..."},{"path":"script.js","content":"..."}]}
O index.html deve referenciar styles.css e script.js. Site completo, moderno, responsivo, em português.`;

function extractJson(text: string): GeneratedProject {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("A IA não retornou JSON válido.");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  if (typeof parsed.projectName === "string") {
    parsed.projectName = parsed.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
  }
  return generatedProjectSchema.parse(parsed);
}

abstract class BaseProvider implements AIProvider {
  protected abstract complete(prompt: string): Promise<string>;

  async generateSite({ prompt }: GenerateSiteInput): Promise<GeneratedProject> {
    try {
      return extractJson(await this.complete(prompt));
    } catch (error) {
      console.error("[AI] provider parse error", error);
      if (error instanceof SyntaxError) throw new Error("A IA respondeu num formato inválido. Tente novamente.");
      throw error;
    }
  }

  async editSite({ prompt, currentFiles }: EditSiteInput): Promise<GeneratedProject> {
    const context = currentFiles
      .filter((f) => ["index.html", "styles.css", "script.js"].includes(f.path))
      .map((f) => `--- ${f.path} ---\\n${f.content.slice(0, 60_000)}`)
      .join("\\n\\n");
    return this.generateSite({
      prompt: `${prompt}\\n\\nArquivos atuais (devolva os 3 arquivos completos, alterando só o necessário):\\n${context}`,
    });
  }
}

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(
    private readonly apiKey: string,
    private readonly endpoint: string,
    private readonly model: string,
    private readonly providerName: string,
  ) {
    super();
  }

  protected async complete(prompt: string) {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        max_tokens: 16000,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`[AI] ${this.providerName} error`, res.status, body.slice(0, 500));
      if (res.status === 401 || res.status === 403) throw new Error(`A chave do ${this.providerName} é inválida ou sem acesso ao modelo.`);
      if (res.status === 429) throw new Error(`Limite do ${this.providerName} atingido. Tente novamente em alguns instantes.`);
      throw new Error(`${this.providerName} não respondeu corretamente.`);
    }
    const json = JSON.parse(body) as { choices?: Array<{ message?: { content?: string }; text?: string }> };
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";
  }
}

export class AnthropicProvider extends BaseProvider {
  protected async complete(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("A chave da Anthropic ainda não foi configurada.");
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 16000, temperature: 0.4, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[AI] Anthropic error", res.status, body.slice(0, 500));
      throw new Error("A Anthropic não respondeu corretamente.");
    }
    const json = JSON.parse(body) as { content?: Array<{ type?: string; text?: string }> };
    return json.content?.filter((x) => x.type === "text").map((x) => x.text ?? "").join("") ?? "";
  }
}

export class GeminiProvider extends BaseProvider {
  protected async complete(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("A chave do Gemini ainda não foi configurada.");
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 16000, responseMimeType: "application/json" },
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[AI] Gemini error", res.status, body.slice(0, 500));
      throw new Error("O Gemini não respondeu corretamente.");
    }
    const json = JSON.parse(body) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
}
