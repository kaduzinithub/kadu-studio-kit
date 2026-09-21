import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPreviewHtml, buildSiteGenerationPrompt } from "@/lib/site-generator";
import type { BriefingLike } from "@/lib/prompt-templates";
import { GeminiProvider } from "@/server/ai/gemini";
import { enforceAiRateLimit } from "@/server/ai/rate-limit";
import { toGeneratedSiteFiles } from "@/server/ai/schemas";

const inputSchema = z.object({
  briefingId: z.string().uuid(),
  request: z.string().trim().max(4_000).optional(),
});
const editSchema = z.object({
  siteId: z.string().uuid(),
  request: z.string().trim().min(3).max(4_000),
});

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    enforceAiRateLimit(context.userId);
    const { data: briefing, error: briefingError } = await context.supabase
      .from("briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (briefingError || !briefing)
      throw new Error("Briefing não encontrado ou sem permissão de acesso.");

    const prompt = `${buildSiteGenerationPrompt(briefing as BriefingLike)}${data.request ? `\n\nPedido adicional do utilizador:\n${data.request}` : ""}`;
    const generated = await new GeminiProvider().generateSite({ prompt });
    const files = toGeneratedSiteFiles(generated);
    const previewHtml = buildPreviewHtml(files);
    const { data: site, error: insertError } = await context.supabase
      .from("generated_sites")
      .insert({
        user_id: context.userId,
        briefing_id: data.briefingId,
        title: generated.title,
        prompt,
        files,
        preview_html: previewHtml,
      })
      .select()
      .single();
    if (insertError)
      throw new Error(`O site foi gerado, mas não pôde ser salvo: ${insertError.message}`);
    console.info("[AI] geração salva e preview concluído");
    return site;
  });

export const editGeneratedSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(editSchema)
  .handler(async ({ data, context }) => {
    enforceAiRateLimit(context.userId);
    const { data: current, error } = await context.supabase
      .from("generated_sites")
      .select("*")
      .eq("id", data.siteId)
      .single();
    if (error || !current)
      throw new Error("Versão do site não encontrada ou sem permissão de acesso.");
    const currentFiles = current.files as unknown as Array<{ path: string; content: string }>;
    const originalFiles = Array.isArray(currentFiles)
      ? currentFiles
      : Object.entries(current.files as Record<string, string>).map(([path, content]) => ({
          path,
          content,
        }));
    const generated = await new GeminiProvider().editSite({
      prompt: `Modifique o site conforme este pedido, preservando o que não precisa mudar: ${data.request}`,
      currentFiles: originalFiles,
    });
    const files = toGeneratedSiteFiles(generated);
    const previewHtml = buildPreviewHtml(files);
    const { data: site, error: insertError } = await context.supabase
      .from("generated_sites")
      .insert({
        user_id: context.userId,
        briefing_id: current.briefing_id,
        title: generated.title,
        prompt: data.request,
        files,
        preview_html: previewHtml,
      })
      .select()
      .single();
    if (insertError)
      throw new Error(`A edição foi gerada, mas não pôde ser salva: ${insertError.message}`);
    console.info("[AI] edição salva e preview concluído");
    return site;
  });
