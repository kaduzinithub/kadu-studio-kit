import { GoogleGenAI } from "@google/genai";
import {
  generatedProjectJsonSchema,
  generatedProjectSchema,
  type GeneratedProject,
} from "./schemas";
import type { AIProvider, EditSiteInput, GenerateSiteInput } from "./types";

function friendlyGeminiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (/429|resource_exhausted|rate limit/i.test(message))
    return new Error(
      "O limite temporário da Gemini foi atingido. Aguarde alguns minutos e tente novamente.",
    );
  if (/401|403|api.?key|permission/i.test(message))
    return new Error("A chave da Gemini é inválida ou não tem permissão para usar este modelo.");
  if (/timeout|timed out|deadline/i.test(message))
    return new Error("A Gemini demorou demais para responder. Tente novamente.");
  if (/500|502|503|unavailable/i.test(message))
    return new Error("A Gemini está indisponível no momento. Tente novamente em alguns minutos.");
  return new Error("Não foi possível gerar o site com a Gemini. Tente novamente.");
}

function parseProject(text: string | undefined): GeneratedProject {
  if (!text) throw new Error("A Gemini retornou uma resposta vazia.");
  try {
    return generatedProjectSchema.parse(JSON.parse(text));
  } catch {
    throw new Error(
      "A Gemini retornou uma estrutura de arquivos inválida. Nenhum arquivo foi salvo.",
    );
  }
}

export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || "gemini-3.8-flash",
  ) {
    if (!apiKey)
      throw new Error(
        "A geração de sites não está configurada. Defina GEMINI_API_KEY no servidor.",
      );
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateSite({ prompt }: GenerateSiteInput): Promise<GeneratedProject> {
    console.info(`[AI] geração iniciada; modelo: ${this.model}`);
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: generatedProjectJsonSchema,
          maxOutputTokens: 24_000,
        },
      });
      console.info("[AI] resposta recebida");
      const project = parseProject(response.text);
      console.info("[AI] arquivos validados");
      return project;
    } catch (error) {
      if (error instanceof Error && /estrutura de arquivos|resposta vazia/.test(error.message))
        throw error;
      throw friendlyGeminiError(error);
    }
  }

  async editSite({ prompt, currentFiles }: EditSiteInput): Promise<GeneratedProject> {
    const context = currentFiles
      .filter((file) => ["index.html", "styles.css", "script.js"].includes(file.path))
      .map((file) => `--- ${file.path} ---\n${file.content.slice(0, 100_000)}`)
      .join("\n\n");
    return this.generateSite({
      prompt: `${prompt}\n\nArquivos atuais (modifique apenas o necessário):\n${context}`,
    });
  }
}
