import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NICHOS, generatePrompt } from "@/lib/prompt-templates";
import {
  STATES,
  ufOf,
  VISUAL_STYLES,
  AUDIENCES,
  GOALS,
  CTAS,
  SITE_PAGES,
} from "@/lib/br-locations";
import { useIbgeCities } from "@/lib/use-ibge-cities";

export const Route = createFileRoute("/_authenticated/briefings")({
  head: () => ({ meta: [{ title: "Briefings — KaduDev Studios" }] }),
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

type FieldType = "text" | "textarea" | "color" | "select" | "state" | "city" | "pages";
const FIELDS: {
  key: keyof Briefing;
  label: string;
  type?: FieldType;
  options?: readonly string[];
}[] = [
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
  { key: "pages", label: "Páginas desejadas", type: "pages" },
  { key: "services", label: "Serviços principais", type: "textarea" },
  { key: "differentials", label: "Diferenciais", type: "textarea" },
  { key: "promotions", label: "Promoções", type: "textarea" },
  { key: "hours", label: "Horário" },
  { key: "cta", label: "CTA principal", type: "select", options: CTAS },
  { key: "notes", label: "Observações", type: "textarea" },
];

function splitPages(value: string | null | undefined): { known: string[]; extra: string } {
  const parts = (value ?? "")
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const known = parts.filter((p) => (SITE_PAGES as readonly string[]).includes(p));
  const extra = parts.filter((p) => !(SITE_PAGES as readonly string[]).includes(p)).join(", ");
  return { known, extra };
}

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
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .order("updated_at", { ascending: false });
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

      const content = generatePrompt(b);
      const title = `Prompt — ${b.company_name || "Briefing"}`;
      const { data: existing } = await supabase
        .from("prompts")
        .select("id")
        .eq("briefing_id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const { error: promptError } = existing
        ? await supabase.from("prompts").update({ title, content }).eq("id", existing.id)
        : await supabase
            .from("prompts")
            .insert({ user_id: user.id, briefing_id: id, title, content });
      if (promptError) throw promptError;
    },
    onSuccess: () => {
      toast.success("Briefing guardado e prompt atualizado");
      qc.invalidateQueries({ queryKey: ["briefings"] });
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const generatedPrompt = useMemo(() => (draft ? generatePrompt(draft) : ""), [draft]);

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
    <div className="space-y-6">
      <PageHeader
        title="Briefings"
        description="Transforme informações da empresa em um briefing pronto para gerar sites."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => createBriefing.mutate()}
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-black font-semibold shadow-[0_0_24px_rgba(249,115,22,0.22)] hover:brightness-110"
            >
              + Novo briefing
            </Button>
            {draft && (
              <Button
                variant="secondary"
                className="border border-orange-500/20 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15"
                onClick={() =>
                  navigate({ to: "/prompts", search: { briefing: draft.id } as never })
                }
              >
                Criar site com IA
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.08] to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Seus briefings</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {list.data?.length ?? 0} projeto{(list.data?.length ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
            </div>
          </div>

          <div className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
            {(list.data ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={`group w-full rounded-xl border px-3 py-3 text-left transition-all ${
                  selected === b.id
                    ? "border-orange-500/30 bg-orange-500/10 shadow-[inset_3px_0_0_rgba(249,115,22,0.9)]"
                    : "border-transparent hover:border-orange-500/10 hover:bg-orange-500/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                    selected === b.id
                      ? "border-orange-400/30 bg-orange-500/15 text-orange-300"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground"
                  }`}>
                    {(b.company_name || "N").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.company_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.niche || "Sem nicho"}{b.city ? ` · ${b.city}` : ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {(list.data ?? []).length === 0 && (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/[0.06] text-orange-300">
                  +
                </div>
                <p className="text-sm font-medium">Nenhum briefing ainda</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crie o primeiro projeto para começar.
                </p>
              </div>
            )}
          </div>
        </Card>

        {draft ? (
          <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
            <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] via-transparent to-transparent px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-orange-400/80">
                    Projeto / Briefing
                  </div>
                  <div className="mt-1 truncate text-xl font-semibold tracking-tight">
                    {draft.company_name || "Novo briefing"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    As alterações são salvas automaticamente.
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1.5 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Auto-save ativo
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className={`space-y-1.5 ${
                      f.type === "textarea" || f.type === "pages" ? "md:col-span-2" : ""
                    }`}
                  >
                    <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                    {f.type === "pages" ? (
                      (() => {
                        const { known, extra } = splitPages(draft.pages);
                        const setPages = (nextKnown: string[], nextExtra: string) =>
                          setDraft({
                            ...draft,
                            pages: [
                              ...nextKnown,
                              ...nextExtra
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            ].join(", "),
                          });
                        return (
                          <div className="space-y-3 rounded-xl border border-orange-500/10 bg-black/20 p-3">
                            <div className="flex flex-wrap gap-2">
                              {SITE_PAGES.map((p) => {
                                const active = known.includes(p);
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() =>
                                      setPages(
                                        active ? known.filter((k) => k !== p) : [...known, p],
                                        extra,
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                                      active
                                        ? "border-orange-400/40 bg-orange-500/15 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.12)]"
                                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-orange-500/25 hover:text-foreground"
                                    }`}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                            </div>
                            <Input
                              placeholder="Outras páginas (separadas por vírgula)…"
                              value={extra}
                              onChange={(e) => setPages(known, e.target.value)}
                            />
                          </div>
                        );
                      })()
                    ) : f.type === "textarea" ? (
                      <Textarea
                        rows={3}
                        value={(draft[f.key] as string) ?? ""}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="border-white/10 bg-black/20 transition-all focus:border-orange-500/40 focus:ring-orange-500/10"
                      />
                    ) : f.type === "color" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(draft[f.key] as string) || "#f97316"}
                          onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-orange-500/15 bg-black/30 p-1"
                        />
                        <Input
                          value={(draft[f.key] as string) ?? ""}
                          onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                          className="border-white/10 bg-black/20 focus:border-orange-500/40 focus:ring-orange-500/10"
                        />
                      </div>
                    ) : f.type === "select" ? (
                      <Select
                        value={(draft[f.key] as string) ?? ""}
                        onValueChange={(v) => setDraft({ ...draft, [f.key]: v })}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40 focus:ring-orange-500/10">
                          <SelectValue placeholder="Escolher…" />
                        </SelectTrigger>
                        <SelectContent className="border-orange-500/15 bg-zinc-950">
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "state" ? (
                      <Select
                        value={(draft.state as string) ?? ""}
                        onValueChange={(v) => setDraft({ ...draft, state: v, city: "" })}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40 focus:ring-orange-500/10">
                          <SelectValue placeholder="Escolher…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 border-orange-500/15 bg-zinc-950">
                          {STATES.map((s) => (
                            <SelectItem key={s.uf} value={s.name}>
                              {s.name} ({s.uf})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "city" ? (
                      <Select
                        value={(draft.city as string) ?? ""}
                        onValueChange={(v) => setDraft({ ...draft, city: v })}
                        disabled={!draft.state || cities.isLoading}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40 focus:ring-orange-500/10">
                          <SelectValue
                            placeholder={
                              !draft.state
                                ? "Escolha o estado primeiro"
                                : cities.isLoading
                                  ? "Carregando cidades…"
                                  : "Escolher…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 border-orange-500/15 bg-zinc-950">
                          {(cities.data ?? []).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={(draft[f.key] as string) ?? ""}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="border-white/10 bg-black/20 transition-all focus:border-orange-500/40 focus:ring-orange-500/10"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-orange-500/10 pt-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Identidade</span>
                  <div
                    className="h-8 w-8 rounded-lg border border-white/10 shadow-[0_0_16px_rgba(249,115,22,0.08)]"
                    style={{ background: draft.primary_color || "#f97316" }}
                  />
                  <div
                    className="h-8 w-8 rounded-lg border border-white/10"
                    style={{ background: draft.secondary_color || "#111" }}
                  />
                </div>
                <div className="sm:ml-auto flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => remove.mutate(draft.id)}
                  >
                    Remover
                  </Button>
                  <Button
                    onClick={() => save.mutate(draft)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.18)] hover:brightness-110"
                  >
                    Guardar briefing
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-orange-500/15 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-center gap-3 border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.08] to-transparent px-4 py-3">
                  <div>
                    <Label className="text-xs font-semibold">Prompt gerado automaticamente</Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Pronto para usar no gerador de sites.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-orange-300 hover:bg-orange-500/10 hover:text-orange-200"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                      toast.success("Prompt copiado");
                    }}
                  >
                    Copiar prompt
                  </Button>
                </div>
                <div className="p-3">
                  <Textarea
                    readOnly
                    value={generatedPrompt}
                    className="min-h-56 border-white/5 bg-black/20 font-mono text-xs leading-relaxed text-zinc-300 focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex min-h-[420px] items-center justify-center border-orange-500/10 bg-black/25 p-10 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/[0.07] text-xl text-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                +
              </div>
              <div className="text-lg font-semibold">Selecione ou crie um briefing</div>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Centralize os dados da empresa e transforme tudo em um prompt profissional.
              </p>
              <Button
                className="mt-5 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black"
                onClick={() => createBriefing.mutate()}
              >
                Criar primeiro briefing
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
