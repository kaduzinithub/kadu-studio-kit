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

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — KaduDev Prompt Engine" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ["settings", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle();
      return data ?? {
        user_id: user.id, company_name: "KaduDev Studios", logo_url: null,
        primary_color: "#d4af37", signature: "Equipa KaduDev Studios", theme: "dark",
      };
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.data) setForm({
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

  return (
    <div>
      <PageHeader title="Configurações" description="Personalize a plataforma e a sua assinatura." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h3 className="font-medium">Marca</h3>
          <div className="space-y-1.5"><Label>Nome da empresa</Label><Input value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>URL do logotipo</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
          <div className="space-y-1.5">
            <Label>Cor principal</Label>
            <div className="flex gap-2">
              <input type="color" value={form.primary_color ?? "#d4af37"} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-9 w-14 rounded-lg border border-border bg-transparent" />
              <Input value={form.primary_color ?? ""} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Tema</Label>
            <select className="w-full h-9 rounded-lg border border-border bg-transparent px-3 text-sm"
              value={form.theme ?? "dark"} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium">Assinatura de mensagens</h3>
          <Textarea rows={6} value={form.signature ?? ""} onChange={(e) => setForm({ ...form, signature: e.target.value })} />
          <p className="text-xs text-muted-foreground">Usada em todas as mensagens comerciais como {"{{assinatura}}"}.</p>
        </Card>

        <Card className="p-6 space-y-3 lg:col-span-2">
          <h3 className="font-medium">Utilizadores</h3>
          <p className="text-sm text-muted-foreground">
            O cadastro público está desativado. Novos utilizadores devem ser criados pelo admin através da consola do backend.
            O primeiro utilizador registado torna-se automaticamente admin.
          </p>
          <div className="text-xs text-muted-foreground">Sessão actual: <b>{user.email}</b></div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()}>Guardar alterações</Button>
      </div>
    </div>
  );
}
