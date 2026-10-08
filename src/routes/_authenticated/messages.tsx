import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import {
  MESSAGE_TYPES,
  renderMessage,
  whatsappUrl,
  type MessageType,
} from "@/lib/message-templates";
import { Copy, MessageCircle, Send, Sparkles } from "lucide-react";

const GROUPS = Array.from(new Set(MESSAGE_TYPES.map((t) => t.group)));

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Mensagens — KaduDev Studios" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [type, setType] = useState<MessageType>("whatsapp_inicial");
  const [leadId, setLeadId] = useState<string>("manual");
  const [briefingId, setBriefingId] = useState<string>("nenhum");
  const [empresa, setEmpresa] = useState("");
  const [cidade, setCidade] = useState("");
  const [nicho, setNicho] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [assinatura, setAssinatura] = useState("KaduDev Studios");
  const [servicos, setServicos] = useState("");
  const [paginas, setPaginas] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [diferenciais, setDiferenciais] = useState("");
  const [link, setLink] = useState("");
  const [origin, setOrigin] = useState("");
  const [content, setContent] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,city,niche,whatsapp")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const briefings = useQuery({
    queryKey: ["briefings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sites = useQuery({
    queryKey: ["generated-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_sites")
        .select("id,title,briefing_id,share_slug,is_public,created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  const settings = useQuery({
    queryKey: ["settings", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings.data?.signature) setAssinatura(settings.data.signature);
  }, [settings.data]);

  useEffect(() => {
    if (leadId === "manual") return;
    const l = leads.data?.find((x) => x.id === leadId);
    if (l) {
      setEmpresa(l.name ?? "");
      setCidade(l.city ?? "");
      setNicho(l.niche ?? "");
      setWhatsapp(l.whatsapp ?? "");
    }
  }, [leadId, leads.data]);

  useEffect(() => {
    if (briefingId === "nenhum") return;
    const b = briefings.data?.find((x) => x.id === briefingId);
    if (!b) return;
    setEmpresa(b.company_name ?? "");
    setCidade(b.city ?? "");
    setNicho(b.niche ?? "");
    setWhatsapp(b.whatsapp ?? b.phone ?? "");
    setServicos(b.services ?? "");
    setPaginas(b.pages ?? "");
    setObjetivo(b.goal ?? "");
    setDiferenciais(b.differentials ?? "");
    const site = sites.data?.find((s) => s.briefing_id === b.id && s.is_public);
    setLink(site && origin ? `${origin}/s/${site.share_slug}` : "");
  }, [briefingId, briefings.data, sites.data, origin]);

  const preview = useMemo(
    () =>
      renderMessage(type, {
        empresa,
        cidade,
        nicho,
        whatsapp,
        assinatura,
        servicos,
        paginas,
        objetivo,
        diferenciais,
        link,
      }),
    [type, empresa, cidade, nicho, whatsapp, assinatura, servicos, paginas, objetivo, diferenciais, link],
  );

  useEffect(() => setContent(preview), [preview]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        user_id: user.id,
        lead_id: leadId === "manual" ? null : leadId,
        type,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem guardada");
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  function openWhatsApp() {
    if (!whatsapp) return toast.error("Informe o número de WhatsApp");
    save.mutate();
    window.open(whatsappUrl(whatsapp, content), "_blank", "noopener");
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    toast.success("Copiado");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Transforme leads em conversas com mensagens prontas para WhatsApp."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.08] via-transparent to-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-300 shadow-[0_0_24px_rgba(249,115,22,0.12)]">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Composer comercial</div>
                <div className="text-xs text-muted-foreground">Selecione os dados e gere a abordagem.</div>
              </div>
              <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1.5 text-[11px] text-emerald-300 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                WhatsApp pronto
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de mensagem</Label>
                <Select value={type} onValueChange={(v) => setType(v as MessageType)}>
                  <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-orange-500/15 bg-zinc-950">
                    {GROUPS.map((group) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {MESSAGE_TYPES.filter((t) => t.group === group).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Briefing</Label>
                <Select value={briefingId} onValueChange={setBriefingId}>
                  <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-orange-500/15 bg-zinc-950">
                    <SelectItem value="nenhum">Sem briefing</SelectItem>
                    {(briefings.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Lead</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="border-white/10 bg-black/20 focus:border-orange-500/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-orange-500/15 bg-zinc-950">
                    <SelectItem value="manual">Manual (sem lead)</SelectItem>
                    {(leads.data ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>

              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>

              <div className="space-y-1.5">
                <Label>Nicho</Label>
                <Input value={nicho} onChange={(e) => setNicho(e.target.value)} className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>

              <div className="space-y-1.5">
                <Label>WhatsApp (com DDI)</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5591999999999" className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>

              <div className="space-y-1.5">
                <Label>Assinatura</Label>
                <Input value={assinatura} onChange={(e) => setAssinatura(e.target.value)} className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Link do site</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Ative o link em Sites com IA" className="border-white/10 bg-black/20 focus:border-orange-500/40" />
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-orange-500/10 bg-orange-500/[0.035] p-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-orange-400/75">Contexto carregado</div>
                <div className="mt-2 text-sm text-foreground">{empresa || "Nenhuma empresa selecionada"}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-orange-400/75">Objetivo</div>
                <div className="mt-2 truncate text-sm text-muted-foreground">{objetivo || "Defina pelo briefing ou manualmente"}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-orange-500/10 pt-5">
              <Button onClick={openWhatsApp} className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.2)] hover:brightness-110">
                <Send className="h-4 w-4" /> Enviar no WhatsApp
              </Button>
              <Button variant="outline" onClick={copy} className="border-orange-500/15 hover:bg-orange-500/10">
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </Button>
              <Button variant="ghost" onClick={() => save.mutate()} className="text-orange-300 hover:bg-orange-500/10">
                Guardar
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] to-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-orange-300" />
              <div>
                <div className="font-semibold">Preview da mensagem</div>
                <div className="text-xs text-muted-foreground">Edite antes de enviar.</div>
              </div>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground">
                {content.length} caracteres
              </span>
            </div>
          </div>
          <div className="p-4 md:p-5">
            <div className="rounded-2xl border border-emerald-500/10 bg-[#07130f] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <div className="mb-3 flex items-center gap-2 border-b border-emerald-500/10 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300">
                  KD
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">KaduDev Studios</div>
                  <div className="text-[10px] text-emerald-400/70">mensagem comercial</div>
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[420px] resize-y border-0 bg-transparent p-0 text-sm leading-6 text-zinc-200 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
