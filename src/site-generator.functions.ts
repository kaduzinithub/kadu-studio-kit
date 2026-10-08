import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPreviewHtml, buildSiteGenerationPrompt } from "@/lib/site-generator";
import type { BriefingLike } from "@/lib/prompt-templates";
import { generateWithFallback } from "@/server/ai/provider";
import { enforceAiRateLimit } from "@/server/ai/rate-limit";
import { toGeneratedSiteFiles } from "@/server/ai/schemas";

const inputSchema = z.object({
  briefingId: z.string().uuid(),
  request: z.string().trim().max(4_000).optional(),
  provider: z.enum(["nvidia", "openai", "openrouter", "anthropic", "gemini", "groq"]).optional(),
  model: z.string().trim().max(120).optional(),
});

const PLAN_LIMITS = {
  starter: { sites: 5, leads: 100, generations: 50 },
  pro: { sites: 20, leads: 500, generations: 250 },
  agency: { sites: Number.POSITIVE_INFINITY, leads: Number.POSITIVE_INFINITY, generations: 1000 },
} as const;

async function enforcePlanLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  resource: "sites" | "generations",
) {
  const { data: access, error: accessError } = await supabase
    .from("access_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (accessError) throw new Error(`Não foi possível verificar seu plano: ${accessError.message}`);
  const expiresAt = access?.expires_at ? new Date(String(access.expires_at)) : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) throw new Error("O seu acesso venceu. Fale com o administrador para renovar.");

  const rawPlan = String((access as Record<string, unknown>).plan ?? (access as Record<string, unknown>).plan_name ?? "pro").toLowerCase();
  const plan = rawPlan.includes("agency") ? "agency" : rawPlan.includes("starter") ? "starter" : "pro";
  const limit = PLAN_LIMITS[plan][resource];

  const query = resource === "sites"
    ? supabase.from("generated_sites").select("id", { count: "exact", head: true }).eq("user_id", userId)
    : supabase.from("generated_sites").select("id", { count: "exact", head: true }).eq("user_id", userId)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const { count, error } = await query;
  if (error) throw new Error(`Não foi possível verificar o uso: ${error.message}`);
  if ((count ?? 0) >= limit) {
    const label = resource === "sites" ? "sites" : "gerações de IA";
    throw new Error(`Limite do plano ${plan} atingido para ${label}. Faça upgrade para continuar.`);
  }
}

const editSchema = z.object({
  siteId: z.string().uuid(),
  request: z.string().trim().min(3).max(4_000),
  provider: z.enum(["nvidia", "openai", "openrouter", "anthropic", "gemini", "groq"]).optional(),
  model: z.string().trim().max(120).optional(),
});

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    enforceAiRateLimit(context.userId);
    await enforcePlanLimit(context.supabase, context.userId, "generations");
    const { data: briefing, error: briefingError } = await context.supabase
      .from("briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (briefingError || !briefing)
      throw new Error("Briefing não encontrado ou sem permissão de acesso.");

    const prompt = `${buildSiteGenerationPrompt(briefing as BriefingLike)}${data.request ? `

Pedido adicional do utilizador:
${data.request}` : ""}`;
    const generated = await generateWithFallback(data.provider, (provider) => provider.generateSite({ prompt }), data.model);
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
    await enforcePlanLimit(context.supabase, context.userId, "generations");
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
    const generated = await generateWithFallback(data.provider, (provider) => provider.editSite({
      prompt: `Modifique o site conforme este pedido, preservando o que não precisa mudar: ${data.request}`,
      currentFiles: originalFiles,
    }), data.model);
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


export const testAIProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    provider: z.enum(["nvidia", "openai", "openrouter", "anthropic", "gemini", "groq"]),
    model: z.string().trim().min(1).max(120),
  }))
  .handler(async ({ data, context }) => {
    enforceAiRateLimit(context.userId);
    const { getAIProvider } = await import("@/server/ai/provider");
    const provider = getAIProvider(data.provider, data.model);
    const started = Date.now();
    await provider.generateSite({ prompt: "Responda com um JSON mínimo válido para teste de conexão." });
    return { status: 200, ok: true, provider: data.provider, model: data.model, latencyMs: Date.now() - started };
  });
