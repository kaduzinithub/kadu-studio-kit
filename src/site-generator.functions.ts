import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildPreviewHtml,
  buildSiteGenerationPrompt,
  generatedSiteSchema,
} from "@/lib/site-generator";
import type { BriefingLike } from "@/lib/prompt-templates";

const inputSchema = z.object({ briefingId: z.string().uuid() });

function parseGeneratedSite(text: string) {
  const json = text
    .trim()
    .replace(/^[\x60]{3}(?:json)?\s*/i, "")
    .replace(/\s*[\x60]{3}$/i, "");
  try {
    return generatedSiteSchema.parse(JSON.parse(json));
  } catch {
    throw new Error("A IA retornou um formato inválido. Tente gerar novamente.");
  }
}

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error(
        "A geração de sites não está configurada. Defina OPENROUTER_API_KEY no ambiente do servidor.",
      );
    const { data: briefing, error: briefingError } = await context.supabase
      .from("briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (briefingError || !briefing)
      throw new Error("Briefing não encontrado ou sem permissão de acesso.");
    const openRouter = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const models = [
      process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
      ...(
        process.env.AI_FALLBACK_MODELS ||
        "poolside/laguna-s-2.1:free,cohere/north-mini-code:free,openrouter/free"
      )
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
    ];
    const prompt = buildSiteGenerationPrompt(briefing as BriefingLike);
    let generated: ReturnType<typeof generatedSiteSchema.parse> | undefined;
    const failures: string[] = [];
    for (const model of [...new Set(models)]) {
      try {
        const result = await generateText({
          model: openRouter(model),
          prompt,
          temperature: 0.4,
        });
        generated = parseGeneratedSite(result.text);
        break;
      } catch (error) {
        console.error(`OpenRouter site generation failed for ${model}`, error);
        failures.push(model);
      }
    }
    if (!generated)
      throw new Error(
        `Não foi possível gerar o site com os modelos configurados (${failures.join(", ")}). Tente novamente em alguns minutos.`,
      );
    const previewHtml = buildPreviewHtml(generated.files);
    const { data: site, error: insertError } = await context.supabase
      .from("generated_sites")
      .insert({
        user_id: context.userId,
        briefing_id: data.briefingId,
        title: generated.title,
        prompt,
        files: generated.files,
        preview_html: previewHtml,
      })
      .select()
      .single();
    if (insertError)
      throw new Error(`O site foi gerado, mas não pôde ser salvo: ${insertError.message}`);
    return site;
  });

