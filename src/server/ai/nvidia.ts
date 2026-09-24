import { generatedProjectSchema, type GeneratedProject } from "./schemas";
import type { AIProvider, EditSiteInput, GenerateSiteInput } from "./types";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-5-3-flash";

const SYSTEM = `Você é um web designer sênior. Responda APENAS com um objeto JSON válido, sem markdown, sem texto extra, no formato:
{"projectName":"kebab-case","title":"Título","files":[{"path":"index.html","content":"..."},{"path":"styles.css","content":"..."},{"path":"script.js","content":"..."}]}
O index.html deve referenciar styles.css e script.js. Site completo, moderno, responsivo, em português.`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export class NvidiaNimProvider implements AIProvider {
  async generateSite({ prompt }: GenerateSiteInput): Promise<GeneratedProject> {
    const apiKey = process.env["NVIDIA_API_KEY"];
    if (!apiKey) throw new Error("A chave da NVIDIA ainda não foi configurada.");
    const model = process.env["NVIDIA_MODEL"] || DEFAULT_MODEL;

    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.4,
        max_tokens: 16000,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("NVIDIA NIM error", res.status, body.slice(0, 500));
      if (res.status === 401 || res.status === 403) throw new Error("A chave da NVIDIA é inválida ou sem acesso a este modelo.");
      if (res.status === 402) throw new Error("A conta NVIDIA ficou sem créditos.");
      if (res.status === 429) throw new Error("Limite da NVIDIA atingido. Aguarde um pouco e tente novamente.");
      if (res.status === 404) throw new Error("Modelo NVIDIA não encontrado.");
      throw new Error("A NVIDIA não respondeu. Tente novamente.");
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          text += j.choices?.[0]?.delta?.content ?? "";
        } catch {
          /* partial */
        }
      }
    }

    try {
      const parsed = extractJson(text) as Record<string, unknown>;
      if (typeof parsed.projectName === "string")
        parsed.projectName = parsed.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
      return generatedProjectSchema.parse(parsed);
    } catch (e) {
      console.error("NVIDIA parse error", e, text.slice(0, 500));
      throw new Error("A IA respondeu num formato inválido. Tente novamente.");
    }
  }

  async editSite({ prompt, currentFiles }: EditSiteInput): Promise<GeneratedProject> {
    const context = currentFiles
      .filter((f) => ["index.html", "styles.css", "script.js"].includes(f.path))
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 60_000)}`)
      .join("\n\n");
    return this.generateSite({
      prompt: `${prompt}\n\nArquivos atuais (devolva os 3 arquivos completos, alterando só o necessário):\n${context}`,
    });
  }
}
