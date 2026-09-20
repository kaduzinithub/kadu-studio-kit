import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NICHOS } from "@/lib/prompt-templates";
import { STATES, ufOf, VISUAL_STYLES, AUDIENCES, GOALS, CTAS, SITE_PAGES } from "@/lib/br-locations";
import { useIbgeCities } from "@/lib/use-ibge-cities";

export const Route = createFileRoute("/_authenticated/briefings")({
  head: () => ({ meta: [{ title: "Briefings — KaduDev Prompt Engine" }] }),
  component: BriefingsPage,
});

type Briefing = {
  id: string;
  company_name: string;
  niche?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  address?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  style?: string | null;
  audience?: string | null;
  goal?: string | null;
  pages?: string | null;
  services?: string | null;
  differentials?: string | null;
  promotions?: string | null;
  hours?: string | null;
  cta?: string | null;
  notes?: string | null;
};

type FieldType = "text" | "textarea" | "color" | "select" | "state" | "city";
const FIELDS: { key: keyof Briefing; label: string; type?: FieldType; options?: readonly string[] }[] = [
  { key: "company_name", label: "Nome da empresa" },
  { key: "niche", label: "Nicho", type: "select", options: NICHOS },
  { key: "state", label: "Estado", type: "state" },
  { key: "city", label: "Cidade", type: "city" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "email", label: "E-mail" },
  { key: "address", label: "Endereço" },
  { key: "primary_color", label: "Cor principal", type: "color" },
  { key: "secondary_color", label: "Cor secundária", type: "color" },
  { key: "style", label: "Estilo visual", type: "select", options: VISUAL_STYLES },
  { key: "audience", label: "Público-alvo", type: "select", options: AUDIENCES },
  { key: "goal", label: "Objetivo do site", type: "select", options: GOALS },
  { key: "pages", label: "Páginas desejadas", type: "textarea" },
  { key: "services", label: "Serviços principais", type: "textarea" },
  { key: "differentials", label: "Diferenciais", type: "textarea" },
  { key: "promotions", label: "Promoções", type: "textarea" },
  { key: "hours", label: "Horário" },
  { key: "cta", label: "CTA principal", type: "select", options: CTAS },
  { key: "notes", label: "Observações", type: "textarea" },
];

function BriefingsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Briefing | null>(null);
  const cities = useIbgeCities(draft?.state ? ufOf(draft.state) : undefined);

  const list = useQuery({
    queryKey: ["briefings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("briefings").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Briefing[];
    },
  });

  useEffect(() => {
    if (!selected && list.data && list.data.length > 0) setSelected(list.data[0].id);
  }, [list.data, selected]);

  useEffect(() => {
    const current = list.data?.find((b) => b.id === selected) ?? null;
    setDraft(current ? { ...current } : null);
  }, [selected, list.data]);

  const createBriefing = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .insert({ user_id: user.id, company_name: "Novo briefing" })
        .select()
        .single();
      if (error) throw error;
      return data as Briefing;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["briefings"] });
      setSelected(b.id);
    },
  });

  const save = useMutation({
    mutationFn: async (b: Briefing) => {
      const { id, ...rest } = b;
      const { error } = await supabase.from("briefings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Briefing guardado");
      qc.invalidateQueries({ queryKey: ["briefings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Autosave
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => save.mutate(draft), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("briefings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["briefings"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Briefings"
        description="Preencha todos os detalhes do site. Guardado automaticamente."
        actions={
          <>
            <Button onClick={() => createBriefing.mutate()}>+ Novo briefing</Button>
            {draft && (
              <Button
                variant="secondary"
                onClick={() => navigate({ to: "/prompts", search: { briefing: draft.id } as never })}
              >
                Gerar prompt
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="p-3">
          <div className="text-xs uppercase text-muted-foreground px-2 pb-2">Briefings</div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {(list.data ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm ${selected === b.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <div className="font-medium truncate">{b.company_name}</div>
                <div className="text-xs text-muted-foreground truncate">{b.niche} · {b.city}</div>
              </button>
            ))}
            {(list.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-6 text-center">Nenhum briefing.</p>
            )}
          </div>
        </Card>

        {draft ? (
          <Card className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={`space-y-1.5 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  ) : f.type === "color" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(draft[f.key] as string) || "#ff7a00"}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="h-9 w-14 rounded-lg border border-border bg-transparent cursor-pointer"
                      />
                      <Input
                        value={(draft[f.key] as string) ?? ""}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      />
                    </div>
                  ) : f.type === "select" ? (
                    <Select
                      value={(draft[f.key] as string) ?? ""}
                      onValueChange={(v) => setDraft({ ...draft, [f.key]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === "state" ? (
                    <Select
                      value={(draft.state as string) ?? ""}
                      onValueChange={(v) => setDraft({ ...draft, state: v, city: "" })}
                    >
                      <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {STATES.map((s) => <SelectItem key={s.uf} value={s.name}>{s.name} ({s.uf})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === "city" ? (
                    <Select
                      value={(draft.city as string) ?? ""}
                      onValueChange={(v) => setDraft({ ...draft, city: v })}
                      disabled={!draft.state || cities.isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!draft.state ? "Escolha o estado primeiro" : cities.isLoading ? "Carregando cidades…" : "Escolher…"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(cities.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <div className="h-8 w-8 rounded-lg border border-border" style={{ background: draft.primary_color || "#ff7a00" }} />
              <div className="h-8 w-8 rounded-lg border border-border" style={{ background: draft.secondary_color || "#111" }} />
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={() => remove.mutate(draft.id)}>Remover</Button>
                <Button onClick={() => save.mutate(draft)}>Guardar</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">
            Selecione ou crie um briefing.
          </Card>
        )}
      </div>
    </div>
  );
}
