import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Globe2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notificações — KaduDev Studios" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = Route.useRouteContext();
  const data = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const [leads, sites, access] = await Promise.all([
        supabase.from("leads").select("id,created_at,status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
        supabase.from("generated_sites").select("id,title,created_at,is_public").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
        supabase.from("access_plans").select("expires_at").eq("user_id", user.id).maybeSingle(),
      ]);
      return { leads: leads.data ?? [], sites: sites.data ?? [], expiresAt: access.data?.expires_at ?? null };
    },
  });

  const items = [
    ...(data.data?.leads ?? []).map((lead) => ({ id: "lead-" + lead.id, icon: UserPlus, tone: "orange", title: "Novo lead adicionado", text: "Status atual: " + (lead.status ?? "Novo") + ".", date: lead.created_at })),
    ...(data.data?.sites ?? []).map((site) => ({ id: "site-" + site.id, icon: Globe2, tone: site.is_public ? "emerald" : "slate", title: site.is_public ? "Site publicado" : "Novo site em rascunho", text: site.title, date: site.created_at })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 18);

  const expires = data.data?.expiresAt ? new Date(data.data.expiresAt) : null;
  const days = expires ? Math.ceil((expires.getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <PageHeader title="Notificações" description="Atividade recente e alertas importantes da sua operação." />
      {days !== null && days <= 7 && (
        <Card className="mb-5 flex items-start gap-3 border-orange-500/20 bg-orange-500/[0.06] p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
          <div><p className="text-sm font-semibold text-white">Seu acesso vence em {Math.max(days, 0)} dia(s).</p><p className="mt-1 text-xs text-white/35">Renove antes da expiração para não perder o acesso ao CRM.</p></div>
        </Card>
      )}
      <Card className="overflow-hidden border-white/[0.07] bg-[#0e0a07]/75">
        {data.isLoading ? <div className="p-10 text-center text-sm text-white/30">Carregando atividade…</div> : items.length === 0 ? (
          <div className="p-14 text-center"><Bell className="mx-auto h-8 w-8 text-white/15" /><p className="mt-4 text-sm font-medium text-white/60">Tudo tranquilo por aqui.</p><p className="mt-1 text-xs text-white/25">Novas atividades aparecerão nesta central.</p></div>
        ) : (
          <div className="divide-y divide-white/[0.045]">{items.map((item) => { const Icon=item.icon; return <div key={item.id} className="flex items-start gap-4 p-5"><div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border " + (item.tone==="emerald" ? "border-emerald-500/15 bg-emerald-500/[0.06]" : "border-orange-500/15 bg-orange-500/[0.06]")}><Icon className={"h-4 w-4 " + (item.tone==="emerald" ? "text-emerald-300" : "text-orange-300")} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-white/80">{item.title}</p><Badge variant="outline" className="text-[9px] text-white/35">{new Date(item.date).toLocaleString("pt-BR")}</Badge></div><p className="mt-1 truncate text-xs text-white/30">{item.text}</p></div><CheckCircle2 className="h-4 w-4 text-white/10" /></div>; })}</div>
        )}
      </Card>
    </div>
  );
}
