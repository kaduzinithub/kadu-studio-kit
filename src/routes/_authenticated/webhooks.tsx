import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link2, Plus, Trash2, Webhook, Zap } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Hook = { id: string; name: string; url: string; events: string[]; active: boolean };

export const Route = createFileRoute("/_authenticated/webhooks")({
  head: () => ({ meta: [{ title: "Webhooks — KaduDev Studios" }] }),
  component: WebhooksPage,
});

const EVENTS = ["lead.created", "lead.updated", "client.created", "site.published", "form.submitted"];

function WebhooksPage() {
  const { user } = Route.useRouteContext();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState(EVENTS[0]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("integration_connections" as never).select("config").eq("user_id", user.id).eq("provider", "webhooks").maybeSingle();
    const config = (data as { config?: { hooks?: Hook[] } } | null)?.config;
    setHooks(Array.isArray(config?.hooks) ? config.hooks : []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [user.id]);

  async function persist(next: Hook[]) {
    const { error } = await supabase.from("integration_connections" as never).upsert({
      user_id: user.id,
      provider: "webhooks",
      status: next.length ? "connected" : "disconnected",
      config: { hooks: next },
      connected_at: next.length ? new Date().toISOString() : null,
    } as never, { onConflict: "user_id,provider" });
    if (error) throw error;
    setHooks(next);
  }

  async function add() {
    const clean = url.trim();
    if (!name.trim() || !clean || !/^https?:\/\//i.test(clean)) return toast.error("Informe nome e uma URL HTTP/HTTPS válida.");
    try {
      const next = [...hooks, { id: crypto.randomUUID(), name: name.trim(), url: clean, events: [event], active: true }];
      await persist(next);
      setName(""); setUrl(""); toast.success("Webhook criado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível criar o webhook."); }
  }

  async function remove(id: string) {
    try { await persist(hooks.filter((hook) => hook.id !== id)); toast.success("Webhook removido."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível remover."); }
  }

  async function toggle(id: string) {
    try { await persist(hooks.map((hook) => hook.id === id ? { ...hook, active: !hook.active } : hook)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."); }
  }

  return (
    <div>
      <PageHeader title="Webhooks" description="Envie eventos do KaduDev para n8n, Make, Zapier ou sistemas próprios." />
      <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        <Card className="border-orange-500/15 bg-[#0e0a07]/75 p-5">
          <div className="flex items-center gap-2"><Webhook className="h-4 w-4 text-orange-300" /><h2 className="text-sm font-semibold text-white">Novo webhook</h2></div>
          <div className="mt-5 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: n8n — novos leads" />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-endpoint.com/webhook" />
            <select value={event} onChange={(e) => setEvent(e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-xs text-white">{EVENTS.map((item) => <option key={item}>{item}</option>)}</select>
            <Button className="w-full" onClick={() => void add()}><Plus className="mr-2 h-4 w-4" />Adicionar webhook</Button>
          </div>
          <p className="mt-4 text-[10px] leading-4 text-white/25">O endpoint recebe JSON quando o evento correspondente for disparado pelo CRM. Use HTTPS em produção.</p>
        </Card>

        <Card className="overflow-hidden border-white/[0.07] bg-[#0e0a07]/75">
          <div className="border-b border-white/[0.06] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Seus endpoints</h2><p className="mt-1 text-xs text-white/30">Configuração persistida por workspace.</p></div><Badge variant="outline" className="text-[10px]">{hooks.length} ativo(s)</Badge></div></div>
          {loading ? <div className="p-10 text-center text-xs text-white/30">Carregando…</div> : hooks.length === 0 ? <div className="p-12 text-center"><Zap className="mx-auto h-7 w-7 text-white/15" /><p className="mt-3 text-sm text-white/55">Nenhum webhook configurado.</p></div> : <div className="divide-y divide-white/[0.05]">{hooks.map((hook) => <div key={hook.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/[0.06]"><Link2 className="h-4 w-4 text-orange-300" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white/75">{hook.name}</p><p className="mt-1 truncate text-xs text-white/30">{hook.url}</p><div className="mt-2 flex flex-wrap gap-1">{hook.events.map((e) => <Badge key={e} variant="outline" className="text-[9px] text-orange-200/70">{e}</Badge>)}</div></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => void toggle(hook.id)}>{hook.active ? "Ativo" : "Pausado"}</Button><Button size="icon" variant="ghost" className="text-red-300/60 hover:text-red-300" onClick={() => void remove(hook.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
        </Card>
      </div>
    </div>
  );
}
