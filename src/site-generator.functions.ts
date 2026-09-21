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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      throw new Error(
        "A geração de sites não está configurada. Defina GROQ_API_KEY no ambiente do servidor.",
      );
    const { data: briefing, error: briefingError } = await context.supabase
      .from("briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (briefingError || !briefing)
      throw new Error("Briefing não encontrado ou sem permissão de acesso.");
    const groq = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
    let generated;
    try {
      const result = await generateText({
        model: groq("openai/gpt-oss-120b"),
        prompt: buildSiteGenerationPrompt(briefing as BriefingLike),
        temperature: 0.4,
      });
      generated = parseGeneratedSite(result.text);
    } catch (error) {
      if (error instanceof Error && error.message.includes("formato inválido")) throw error;
      console.error("Groq site generation failed", error);
      throw new Error(
        "Não foi possível gerar o site agora. Verifique GROQ_API_KEY e tente novamente.",
      );
    }
    const previewHtml = buildPreviewHtml(generated.files);
    const { data: site, error: insertError } = await context.supabase
      .from("generated_sites")
      .insert({
        user_id: context.userId,
        briefing_id: data.briefingId,
        title: generated.title,
        prompt: buildSiteGenerationPrompt(briefing as BriefingLike),
        files: generated.files,
        preview_html: previewHtml,
      })
      .select()
      .single();
    if (insertError)
      throw new Error(`O site foi gerado, mas não pôde ser salvo: ${insertError.message}`);
    return site;
  });
