import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Gauge, Globe2, Sparkles, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Plano e uso — KaduDev Studios" }] }),
  component: BillingPage,
});

const PLANS = [
  { name: "Starter", price: "R$ 39,90", period: "/mês", description: "Para começar a vender sites e automações.", features: ["5 sites publicados", "100 leads", "50 gerações IA/mês", "Tracking básico"], featured: false },
  { name: "Pro", price: "R$ 59,90", period: "/mês", description: "Para quem quer operar o CRM todos os dias.", features: ["20 sites publicados", "500 leads", "250 gerações IA/mês", "Tracking avançado", "Relatórios e integrações"], featured: true },
  { name: "Agency", price: "R$ 149,90", period: "/mês", description: "Para atender vários clientes em escala.", features: ["Sites ilimitados*", "Leads ilimitados*", "Gerações IA em alta escala", "White-label", "Domínios personalizados"], featured: false },
];

function BillingPage() {
  const { user } = Route.useRouteContext();
  const access = useQuery({
    queryKey: ["billing-access", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("access_plans").select("expires_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data?.expires_at ?? null;
    },
  });
  const stats = useQuery({
    queryKey: ["billing-usage", user.id],
    queryFn: async () => {
      const [sites, leads, clients, briefings] = await Promise.all([
        supabase.from("generated_sites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("briefings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return { sites: sites.count ?? 0, leads: leads.count ?? 0, clients: clients.count ?? 0, briefings: briefings.count ?? 0 };
    },
  });

  const expires = access.data ? new Date(access.data) : null;
  const active = !!expires && expires.getTime() > Date.now();
  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000)) : null;

  return (
    <div>
      <PageHeader title="Plano e uso" description="Veja seu acesso, consumo atual e os planos disponíveis para escalar o KaduDev." />
      <Card className="mb-6 overflow-hidden border-orange-500/15 bg-gradient-to-br from-orange-500/[0.08] via-[#0e0a07]/90 to-[#0e0a07] p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-orange-400" /><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300/70">Seu acesso</span></div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{active ? "Acesso ativo" : "Acesso expirado"}</h2>
            <p className="mt-1 text-sm text-white/35">{active && daysLeft !== null ? `${daysLeft} dia${daysLeft === 1 ? "" : "s"} restante${daysLeft === 1 ? "" : "s"}` : "Fale com o administrador para renovar seu acesso."}</p>
          </div>
          <Button onClick={() => window.open("https://wa.me/?text=Quero%20renovar%20meu%20acesso%20ao%20KaduDev", "_blank", "noopener,noreferrer")}><Zap className="mr-2 h-4 w-4" /> Renovar acesso</Button>
        </div>
      </Card>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sites", value: stats.data?.sites ?? 0, icon: Globe2 },
          { label: "Leads", value: stats.data?.leads ?? 0, icon: Users },
          { label: "Clientes", value: stats.data?.clients ?? 0, icon: Users },
          { label: "Briefings", value: stats.data?.briefings ?? 0, icon: Gauge },
        ].map((item) => { const Icon = item.icon; return <Card key={item.label} className="border-white/[0.07] bg-[#0e0a07]/75 p-5"><Icon className="h-4 w-4 text-orange-400/70" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">{item.label}</p><p className="mt-1 text-2xl font-semibold text-white">{item.value}</p></Card>; })}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => <Card key={plan.name} className={`relative flex h-full flex-col overflow-hidden p-6 ${plan.featured ? "border-orange-500/30 bg-orange-500/[0.06] shadow-[0_0_60px_rgba(255,100,0,0.08)]" : "border-white/[0.07] bg-[#0e0a07]/75"}`}>
          {plan.featured && <Badge className="absolute right-5 top-5 border-orange-400/20 bg-orange-400/10 text-orange-300">Mais escolhido</Badge>}
          <Sparkles className="h-5 w-5 text-orange-400" />
          <h3 className="mt-4 text-xl font-semibold text-white">{plan.name}</h3>
          <p className="mt-1 min-h-10 text-xs leading-5 text-white/35">{plan.description}</p>
          <div className="mt-5"><span className="text-3xl font-bold text-white">{plan.price}</span><span className="text-sm text-white/30">{plan.period}</span></div>
          <div className="mt-6 space-y-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-2 text-xs text-white/55"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />{feature}</div>)}</div>
          <Button className="mt-auto pt-2" variant={plan.featured ? "default" : "outline"} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Quero assinar o plano ${plan.name} do KaduDev.`)}`, "_blank", "noopener,noreferrer")}>Escolher {plan.name}</Button>
        </Card>)}
      </div>
      <p className="mt-5 text-center text-[10px] text-white/20">* Limites podem variar conforme o contrato. A cobrança automática pode ser conectada ao gateway quando as credenciais de produção estiverem configuradas.</p>
    </div>
  );
}
