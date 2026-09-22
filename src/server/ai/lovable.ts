import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { generatedProjectSchema, type GeneratedProject } from "./schemas";
import type { AIProvider, EditSiteInput, GenerateSiteInput } from "./types";

function friendlyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (/402|credit|insufficient/i.test(message))
    return new Error(
      "Os créditos de IA do espaço de trabalho acabaram. Adicione créditos para continuar gerando sites.",
    );
  if (/429|rate limit/i.test(message))
    return new Error("Muitas gerações ao mesmo tempo. Aguarde alguns instantes e tente novamente.");
  if (/401|403/i.test(message))
    return new Error("A IA não está autorizada neste projeto. Tente novamente mais tarde.");
  return new Error("Não foi possível gerar o site com a IA. Tente novamente.");
}

export class LovableAiProvider implements AIProvider {
  async generateSite({ prompt }: GenerateSiteInput): Promise<GeneratedProject> {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A geração de sites não está configurada no servidor.");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        prompt,
        output: Output.object({ schema: generatedProjectSchema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const project = await result.output;
      return generatedProjectSchema.parse(project);
    } catch (error) {
      throw friendlyError(error);
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
