import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import { Palette, MessageSquareText, ShieldCheck, Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — KaduDev Studios" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ["settings", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (
        data ?? {
          user_id: user.id,
          company_name: "KaduDev Studios",
          logo_url: null,
          primary_color: "#d4af37",
          signature: "Equipa KaduDev Studios",
          theme: "dark",
        }
      );
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.data)
      setForm({
        company_name: settings.data.company_name ?? "",
        logo_url: settings.data.logo_url ?? "",
        primary_color: settings.data.primary_color ?? "#d4af37",
        signature: settings.data.signature ?? "",
        theme: settings.data.theme ?? "dark",
      });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").upsert({ user_id: user.id, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações guardadas");
      qc.invalidateQueries({ queryKey: ["settings", user.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Controle a identidade, comunicação e aparência do seu workspace." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.09] via-orange-500/[0.03] to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-300"><Palette className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Identidade da marca</h3>
                <p className="mt-1 text-xs text-muted-foreground">Personalize como sua operação aparece no CRM.</p>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input value={form.company_name ?? ""} onChange={(e) => update("company_name", e.target.value)} className="border-orange-500/10 bg-white/[0.025] focus-visible:ring-orange-500/30" />
            </div>
            <div className="space-y-2">
              <Label>URL do logotipo</Label>
              <Input value={form.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://…" className="border-orange-500/10 bg-white/[0.025] focus-visible:ring-orange-500/30" />
            </div>
            <div className="space-y-2">
              <Label>Cor principal</Label>
              <div className="flex gap-3">
                <input type="color" value={form.primary_color ?? "#d4af37"} onChange={(e) => update("primary_color", e.target.value)} className="h-10 w-14 cursor-pointer rounded-xl border border-orange-500/20 bg-black p-1" />
                <Input value={form.primary_color ?? ""} onChange={(e) => update("primary_color", e.target.value)} className="border-orange-500/10 bg-white/[0.025] font-mono focus-visible:ring-orange-500/30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tema</Label>
              <select value={form.theme ?? "dark"} onChange={(e) => update("theme", e.target.value)} className="h-10 w-full rounded-xl border border-orange-500/10 bg-black/40 px-3 text-sm outline-none focus:border-orange-500/30">
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.09] to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-300"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Prévia da marca</h3>
                <p className="mt-1 text-xs text-muted-foreground">Veja a identidade antes de salvar.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/15 bg-[#080808] p-5 shadow-[0_0_45px_rgba(249,115,22,0.08)]">
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="relative flex items-center gap-3">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-300 via-orange-500 to-amber-600 text-lg font-black text-black shadow-[0_0_24px_rgba(249,115,22,0.25)]">K</div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{form.company_name || "KaduDev Studios"}</div>
                  <div className="text-xs text-muted-foreground">Workspace premium</div>
                </div>
              </div>
              <div className="relative mt-6 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-500 to-amber-300" /></div>
              <div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>Identidade ativa</span><span>{form.theme === "light" ? "Claro" : "Escuro"}</span></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-300"><MessageSquareText className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Assinatura de mensagens</h3>
                <p className="mt-1 text-xs text-muted-foreground">Texto usado nas mensagens comerciais.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-6">
            <Textarea rows={7} value={form.signature ?? ""} onChange={(e) => update("signature", e.target.value)} className="border-orange-500/10 bg-white/[0.025] focus-visible:ring-orange-500/30" placeholder="Ex.: Equipa KaduDev Studios" />
            <p className="text-xs leading-5 text-muted-foreground">Use <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-orange-200">{"{{assinatura}}"}</span> nos modelos para inserir este texto automaticamente.</p>
          </div>
        </Card>

        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-emerald-500/[0.06] to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-2.5 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Acesso e segurança</h3>
                <p className="mt-1 text-xs text-muted-foreground">Estado da sua sessão atual.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-xs text-muted-foreground">Conta autenticada</div>
              <div className="mt-1 truncate text-sm font-medium">{user.email}</div>
            </div>
            <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>O cadastro público está desativado. Novos utilizadores devem ser criados pelo administrador através do backend.</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="min-w-44 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black shadow-[0_0_28px_rgba(249,115,22,0.18)] hover:brightness-110">
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Salvando…" : "Guardar alterações"}
        </Button>
      </div>
    </div>
  );
}