import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronRight, Code2, Facebook, Globe2, Link2, MousePointerClick, Plus, Radio, Search, ShieldCheck, Sparkles, Target, TrendingUp, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Integrações — KaduDev Studios" }] }),
  component: IntegrationsPage,
});

type Integration = {
  id: string;
  name: string;
  category: "Ads" | "Analytics" | "Tracking" | "Automação";
  description: string;
  detail: string;
  icon: typeof Globe2;
  accent: string;
  status: "available" | "coming";
};

const INTEGRATIONS: Integration[] = [
  { id: "meta-ads", name: "Meta Ads", category: "Ads", description: "Conecte campanhas do Facebook e Instagram ao seu funil.", detail: "Estrutura para campanhas, contas de anúncios e métricas de aquisição.", icon: Facebook, accent: "from-blue-500/20 to-indigo-500/5", status: "available" },
  { id: "google-ads", name: "Google Ads", category: "Ads", description: "Acompanhe tráfego pago e conversões vindas do Google.", detail: "Estrutura para campanhas, conversões e atribuição.", icon: Target, accent: "from-yellow-500/20 to-orange-500/5", status: "available" },
  { id: "tiktok-ads", name: "TikTok Ads", category: "Ads", description: "Centralize campanhas e aquisição vindas do TikTok.", detail: "Estrutura preparada para contas, campanhas e eventos.", icon: Radio, accent: "from-cyan-400/15 to-pink-500/5", status: "available" },
  { id: "ga4", name: "Google Analytics 4", category: "Analytics", description: "Veja comportamento, aquisição e conversões do site.", detail: "Conecte uma propriedade GA4 para alimentar seus relatórios.", icon: TrendingUp, accent: "from-orange-500/20 to-yellow-500/5", status: "available" },
  { id: "gtm", name: "Google Tag Manager", category: "Tracking", description: "Gerencie pixels, tags e eventos sem editar o site.", detail: "Ideal para instalar e controlar rastreamento de campanhas.", icon: Code2, accent: "from-blue-400/15 to-cyan-400/5", status: "available" },
  { id: "meta-pixel", name: "Meta Pixel", category: "Tracking", description: "Rastreie visitas e eventos para otimizar seus anúncios.", detail: "Prepare o site para PageView, Lead e eventos personalizados.", icon: MousePointerClick, accent: "from-blue-500/20 to-purple-500/5", status: "available" },
  { id: "utm", name: "UTM & Atribuição", category: "Analytics", description: "Padronize links e descubra de onde seus leads vieram.", detail: "Campanha, origem, mídia, conteúdo e termo organizados no CRM.", icon: Link2, accent: "from-orange-500/20 to-red-500/5", status: "available" },
  { id: "webhooks", name: "Webhooks", category: "Automação", description: "Envie eventos do KaduDev para outras ferramentas.", detail: "Base para automações, n8n, Make, Zapier e sistemas próprios.", icon: Webhook, accent: "from-emerald-500/15 to-teal-500/5", status: "available" },
];

type ConnectionRow = {
  provider: string;
  status: "connected" | "disconnected" | "error";
  account_name: string | null;
  account_id: string | null;
  connected_at: string | null;
};

function IntegrationsPage() {
  const { user } = Route.useRouteContext();
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Integration | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [trackingSite, setTrackingSite] = useState("");
  const [tracking, setTracking] = useState({ ga4_measurement_id: "", google_tag_manager_id: "", meta_pixel_id: "", tiktok_pixel_id: "", utm_source_default: "", utm_medium_default: "", utm_campaign_default: "", track_page_views: true, track_whatsapp_clicks: true, track_phone_clicks: true, track_form_submissions: true });
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingPreviewHtml, setTrackingPreviewHtml] = useState("");
  const [trackingPreviewLoading, setTrackingPreviewLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("provider,status,account_name,account_id,connected_at")
        .eq("user_id", user.id);

      if (!active) return;
      if (error) toast.error("Não foi possível carregar as integrações.");
      else setConnections((data ?? []) as unknown as ConnectionRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("generated_sites").select("id,title,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      setSites((data ?? []) as Array<{ id: string; title: string; created_at: string }>);
      if (data?.[0]?.id) setTrackingSite(data[0].id);
    })();
  }, [user.id]);

  useEffect(() => {
    if (!trackingSite) return;
    void (async () => {
      const { data } = await supabase.from("site_tracking" as never).select("ga4_measurement_id,google_tag_manager_id,meta_pixel_id,tiktok_pixel_id,utm_source_default,utm_medium_default,utm_campaign_default,track_page_views,track_whatsapp_clicks,track_phone_clicks,track_form_submissions").eq("user_id", user.id).eq("site_id", trackingSite).maybeSingle();
      if (data) setTracking((current) => ({ ...current, ...(data as Partial<typeof current>) }));
      else setTracking((current) => ({ ...current, ga4_measurement_id: "", google_tag_manager_id: "", meta_pixel_id: "", tiktok_pixel_id: "", utm_source_default: "", utm_medium_default: "", utm_campaign_default: "" }));
    })();
  }, [trackingSite, user.id]);

  useEffect(() => {
    if (!trackingSite) { setTrackingPreviewHtml(""); return; }
    setTrackingPreviewLoading(true);
    void (async () => {
      const { data } = await supabase.from("generated_sites").select("preview_html").eq("id", trackingSite).eq("user_id", user.id).maybeSingle();
      if (data?.preview_html) setTrackingPreviewHtml(String(data.preview_html));
      else setTrackingPreviewHtml("");
      setTrackingPreviewLoading(false);
    })();
  }, [trackingSite, user.id]);

  const trackingSummary = [
    tracking.ga4_measurement_id && "GA4",
    tracking.google_tag_manager_id && "GTM",
    tracking.meta_pixel_id && "Meta Pixel",
    tracking.tiktok_pixel_id && "TikTok Pixel",
  ].filter(Boolean) as string[];

  const saveTracking = async () => {
    if (!trackingSite) return toast.error("Gere um site primeiro para configurar o tracking.");
    setTrackingSaving(true);
    const { error } = await supabase.from("site_tracking" as never).upsert({ user_id: user.id, site_id: trackingSite, ...tracking } as never, { onConflict: "user_id,site_id" });
    setTrackingSaving(false);
    if (error) toast.error(error.message); else toast.success("Tracking salvo para este site.");
  };

  const filtered = useMemo(() => INTEGRATIONS.filter((item) => {
    const matchesCategory = category === "Todas" || item.category === category;
    const q = search.trim().toLowerCase();
    return matchesCategory && (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  }), [category, search]);

  const connectedCount = connections.filter((item) => item.status === "connected").length;
  const getConnection = (provider: string) => connections.find((item) => item.provider === provider);
  const isConnected = (provider: string) => getConnection(provider)?.status === "connected";

  const toggleConnection = async (item: Integration) => {
    setSaving(true);
    const currentlyConnected = isConnected(item.id);
    const { data, error } = await supabase
      .from("integration_connections" as never)
      .upsert({
        user_id: user.id,
        provider: item.id,
        status: currentlyConnected ? "disconnected" : "connected",
        connected_at: currentlyConnected ? null : new Date().toISOString(),
      } as never, { onConflict: "user_id,provider" })
      .select("provider,status,account_name,account_id,connected_at")
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    const next = data as unknown as ConnectionRow;
    setConnections((current) => [...current.filter((row) => row.provider !== item.id), next]);
    toast.success(currentlyConnected ? item.name + " desativado." : item.name + " ativado para esta conta.");
    setSelected(null);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Integrações"
        description="Conecte anúncios, analytics e rastreamento ao seu ecossistema KaduDev."
        actions={<Button onClick={() => setSelected(INTEGRATIONS[0])}><Plus className="mr-2 h-4 w-4" />Adicionar integração</Button>}
      />

      <Card className="relative overflow-hidden border-orange-500/15 bg-gradient-to-br from-orange-500/[0.08] via-[#100a06] to-transparent p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/[0.10] blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_.6fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/15 bg-orange-400/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300/80"><Sparkles className="h-3 w-3" /> Integration Hub</div>
            <h2 className="max-w-3xl font-display text-2xl font-semibold tracking-tight text-white md:text-4xl">Seu site não termina no deploy.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Ligue o site gerado ao tráfego pago, analytics e rastreamento. A ideia é transformar o KaduDev em uma camada operacional entre aquisição, site e CRM.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Ativas" value={loading ? "—" : String(connectedCount)} />
            <Stat label="Disponíveis" value={String(INTEGRATIONS.filter((item) => item.status === "available").length)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Todas", "Ads", "Analytics", "Tracking"].map((item) => (
          <button key={item} onClick={() => setCategory(item)} className={"rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-all " + (category === item ? "border-orange-500/25 bg-orange-500/[0.09] text-orange-300" : "border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/[0.12] hover:text-white")}>{item}</button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar integração..." className="h-11 rounded-xl border-white/[0.07] bg-white/[0.025] pl-11 text-white placeholder:text-white/25" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const Icon = item.icon;
          const connected = isConnected(item.id);
          return (
            <Card key={item.id} className="group relative overflow-hidden border-white/[0.07] bg-white/[0.018] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/20 hover:bg-white/[0.03] hover:shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className={"absolute inset-x-0 top-0 h-24 bg-gradient-to-br " + item.accent + " opacity-60"} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0e0a07] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"><Icon className="h-5 w-5 text-orange-300" /></div>
                  <Badge variant="outline" className={connected ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300" : "border-orange-500/15 bg-orange-500/[0.05] text-orange-300/80"}>{connected ? "Ativo" : "Disponível"}</Badge>
                </div>
                <h3 className="mt-6 text-base font-semibold text-white">{item.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5 text-white/40">{item.description}</p>
                <Button variant="ghost" className="mt-5 w-full justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/65 hover:bg-orange-500/[0.07] hover:text-orange-200" onClick={() => setSelected(item)}>
                  {connected ? "Gerenciar" : "Configurar"} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden border-orange-500/15 bg-gradient-to-br from-orange-500/[0.06] via-black/20 to-transparent">
        <div className="border-b border-orange-500/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-white"><MousePointerClick className="h-4 w-4 text-orange-300" /> Tracking Center</div><p className="mt-1 text-xs text-white/35">Configure pixels, analytics e atribuição por site gerado.</p></div>
            <select value={trackingSite} onChange={(e) => setTrackingSite(e.target.value)} className="h-10 min-w-64 rounded-xl border border-orange-500/15 bg-black/40 px-3 text-xs text-white outline-none"><option value="">Selecione um site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.title}</option>)}</select>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {[["ga4_measurement_id","GA4 Measurement ID","G-XXXXXXXXXX"],["google_tag_manager_id","Google Tag Manager","GTM-XXXXXXX"],["meta_pixel_id","Meta Pixel","ID do Pixel"],["tiktok_pixel_id","TikTok Pixel","ID do Pixel"]].map(([key,label,placeholder]) => <div key={key} className="space-y-2"><label className="text-xs font-semibold text-white/65">{label}</label><Input value={tracking[key as keyof typeof tracking] as string} onChange={(e) => setTracking((current) => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} className="border-white/[0.07] bg-black/25 text-white placeholder:text-white/20" /></div>)}
          <div className="md:col-span-2 grid gap-4 sm:grid-cols-3">
            {[["utm_source_default","UTM Source"],["utm_medium_default","UTM Medium"],["utm_campaign_default","UTM Campaign"]].map(([key,label]) => <div key={key} className="space-y-2"><label className="text-xs font-semibold text-white/65">{label}</label><Input value={tracking[key as keyof typeof tracking] as string} onChange={(e) => setTracking((current) => ({ ...current, [key]: e.target.value }))} placeholder="Opcional" className="border-white/[0.07] bg-black/25 text-white placeholder:text-white/20" /></div>)}
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[["track_page_views","PageView"],["track_whatsapp_clicks","WhatsApp"],["track_phone_clicks","Telefone"],["track_form_submissions","Formulários"]].map(([key,label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/55"><input type="checkbox" checked={tracking[key as keyof typeof tracking] as boolean} onChange={(e) => setTracking((current) => ({ ...current, [key]: e.target.checked }))} />{label}</label>)}</div>
          <div className="md:col-span-2 flex flex-col gap-3 rounded-xl border border-orange-500/10 bg-orange-500/[0.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white">Preview com Tracking Center</div>
                <p className="mt-1 text-[11px] text-white/35">A prévia usa a versão atual do site selecionado. Salve o tracking e publique para aplicar os scripts no link público.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trackingSummary.length ? trackingSummary.map((item) => <Badge key={item} variant="outline" className="border-orange-500/15 bg-orange-500/[0.05] text-[10px] text-orange-200">{item}</Badge>) : <Badge variant="outline" className="border-white/[0.08] text-[10px] text-white/30">Nenhum pixel configurado</Badge>}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white">
              {trackingPreviewLoading ? <div className="flex h-80 items-center justify-center text-xs text-black/45">Carregando preview…</div> : trackingPreviewHtml ? <iframe title="Preview do site com Tracking Center" srcDoc={trackingPreviewHtml} sandbox="allow-scripts allow-forms allow-popups" className="h-[520px] w-full" /> : <div className="flex h-80 items-center justify-center text-xs text-black/45">Selecione um site para visualizar o preview.</div>}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end"><Button onClick={() => void saveTracking()} disabled={trackingSaving || !trackingSite}>{trackingSaving ? "Salvando…" : "Salvar tracking"}</Button></div>
        </div>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.015] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06]"><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>
          <div className="flex-1"><h3 className="text-sm font-semibold text-white">Segurança primeiro</h3><p className="mt-1 text-xs leading-5 text-white/35">Tokens e chaves de integração devem ficar no backend/Secrets. Nunca coloque credenciais diretamente no código do site.</p></div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/70"><CheckCircle2 className="h-3.5 w-3.5" /> Dados separados por usuário</div>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="border-white/[0.08] bg-[#100b08] text-white sm:max-w-lg">
          {selected && (() => {
            const Icon = selected.icon;
            const connection = getConnection(selected.id);
            const active = connection?.status === "connected";
            return <>
              <DialogHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/15 bg-orange-500/[0.06]"><Icon className="h-5 w-5 text-orange-300" /></div>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription className="text-white/40">{selected.detail}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><Globe2 className="h-4 w-4 text-orange-300" /> Conexão por conta</div>
                  <p className="mt-2 text-xs leading-5 text-white/35">O vínculo fica salvo no seu workspace. A autenticação OAuth/API de cada provedor será adicionada na próxima camada, sem expor tokens no navegador.</p>
                </div>
                {connection && <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs text-white/30">Última alteração: <span className="text-white/60">{connection.connected_at ? new Date(connection.connected_at).toLocaleString("pt-BR") : "desativado"}</span></div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                <Button disabled={saving} onClick={() => void toggleConnection(selected)}>{saving ? "Salvando…" : active ? "Desativar" : "Ativar integração"}</Button>
              </DialogFooter>
            </>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-2xl font-semibold text-white">{value}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{label}</div></div>;
}
