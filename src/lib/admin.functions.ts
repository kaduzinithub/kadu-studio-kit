import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito ao administrador.");
}

function genPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

const PLANS = ["1m", "3m", "1y", "lifetime"] as const;
const planSchema = z.enum(PLANS);
function expiryFor(plan: (typeof PLANS)[number]): string | null {
  if (plan === "lifetime") return null;
  const d = new Date();
  if (plan === "1m") d.setMonth(d.getMonth() + 1);
  if (plan === "3m") d.setMonth(d.getMonth() + 3);
  if (plan === "1y") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

async function priceOf(admin: any, plan: string): Promise<number> {
  const { data } = await admin.from("plan_prices").select("price").eq("plan", plan).maybeSingle();
  return Number(data?.price ?? 0);
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
}

export const listAccesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const { data: plans } = await supabaseAdmin.from("access_plans").select("user_id, plan, expires_at, whatsapp, last_charged_at, price_paid");
    const planMap = new Map((plans ?? []).map((p) => [p.user_id, p]));
    return data.users.filter((u) => !admins.has(u.id)).map((u) => ({
      plan: planMap.get(u.id)?.plan ?? "lifetime",
      expires_at: planMap.get(u.id)?.expires_at ?? null,
      whatsapp: planMap.get(u.id)?.whatsapp ?? "",
      last_charged_at: planMap.get(u.id)?.last_charged_at ?? null,
      price_paid: planMap.get(u.id)?.price_paid ?? null,
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.name as string) ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned: !!(u as any).banned_until && new Date((u as any).banned_until) > new Date(),
      is_admin: admins.has(u.id),
    }));
  });

export const createAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(120).optional().or(z.literal("")), plan: planSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email =
      data.email && data.email.length > 0
        ? data.email.toLowerCase()
        : `${slugify(data.name) || "cliente"}.${genPassword(4).toLowerCase()}@kadudev.app`;
    const password = genPassword(12);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message.includes("already") ? "Este email já tem acesso." : error.message);
    await supabaseAdmin.from("access_plans").upsert({
      user_id: created.user.id,
      plan: data.plan,
      expires_at: expiryFor(data.plan),
      price_paid: await priceOf(supabaseAdmin, data.plan),
    });
    return { email, password };
  });

export const setAccessPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), plan: planSchema }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("access_plans").upsert({
      user_id: data.id,
      plan: data.plan,
      expires_at: expiryFor(data.plan),
      price_paid: await priceOf(supabaseAdmin, data.plan),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAccessPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = genPassword(12);
    const { data: u, error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password });
    if (error) throw new Error(error.message);
    return { email: u.user.email ?? "", password };
  });

export const setAccessBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), blocked: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    if (data.id === (context as Ctx).userId) throw new Error("Não pode bloquear a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    if (data.id === (context as Ctx).userId) throw new Error("Não pode apagar a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAccessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        whatsapp: z.string().trim().max(20).regex(/^[0-9+()\s-]*$/).optional(),
        charged: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("access_plans")
      .select("user_id")
      .eq("user_id", data.id)
      .maybeSingle();
    const patch: { whatsapp?: string; last_charged_at?: string } = {};
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp.replace(/\D/g, "");
    if (data.charged) patch.last_charged_at = new Date().toISOString();
    const { error } = existing
      ? await supabaseAdmin.from("access_plans").update(patch).eq("user_id", data.id)
      : await supabaseAdmin.from("access_plans").insert({ user_id: data.id, plan: "lifetime", ...patch });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
