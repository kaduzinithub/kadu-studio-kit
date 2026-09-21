import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { brl } from "@/lib/format";
import { Users, MessageSquare, Sparkles, TrendingUp, Briefcase, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KaduDev Prompt Engine" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [leads, prompts, messages, clients] = await Promise.all([
        supabase.from("leads").select("id,status,created_at"),
        supabase.from("prompts").select("id,created_at"),
        supabase.from("messages").select("id,created_at"),
        supabase.from("clients").select("id,project_value,close_date,status,niche,name,city,created_at"),
      ]);
      return {
        leads: leads.data ?? [],
        prompts: prompts.data ?? [],
        messages: messages.data ?? [],
        clients: clients.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Visão geral da operação." />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const today = new Date().toDateString();
  const monthKey = new Date().toISOString().slice(0, 7);
  const leadsHoje = data.leads.filter((l) => new Date(l.created_at as string).toDateString() === today).length;
  const leadsMes = data.leads.filter((l) => (l.created_at as string).startsWith(monthKey)).length;
  const closed = data.clients.filter((c) => c.status === "fechado" || c.close_date);
  const receitaMes = closed
    .filter((c) => (c.close_date ?? "").startsWith(monthKey))
    .reduce((s, c) => s + Number(c.project_value || 0), 0);
  const vendasFechadas = closed.length;

  // Leads por dia (últimos 14)
  const leadsPorDia = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return { day: label, leads: data.leads.filter((l) => (l.created_at as string).slice(0, 10) === key).length };
  });

  // Conversão por nicho
  const byNiche = new Map<string, number>();
  for (const c of data.clients) byNiche.set(c.niche || "Outros", (byNiche.get(c.niche || "Outros") ?? 0) + 1);
  const nichoData = [...byNiche.entries()].map(([niche, total]) => ({ niche, total }));

  const cards = [
    { label: "Leads hoje", value: leadsHoje, icon: MapPin },
    { label: "Leads mês", value: leadsMes, icon: Users },
    { label: "Prompts gerados", value: data.prompts.length, icon: Sparkles },
    { label: "Mensagens", value: data.messages.length, icon: MessageSquare },
    { label: "Vendas fechadas", value: vendasFechadas, icon: Briefcase },
    { label: "Receita mensal", value: brl.format(receitaMes), icon: TrendingUp },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da operação KaduDev Studios." />
      <div className="stagger-grid grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, index) => (
          <Card key={c.label} className="group p-5 bg-card" style={{ animationDelay: `${index * 55}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="h-4 w-4 text-primary transition-colors group-hover:text-primary-foreground" />
              </span>
            </div>
            <div className="text-2xl font-semibold mt-3">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card className="p-6">
          <h3 className="font-medium mb-4">Leads por dia (14d)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={leadsPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-medium mb-4">Clientes por nicho</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={nichoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="niche" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="total" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-medium mb-4">Leads recentes</h3>
        {data.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há leads. Comece pela página Empresas / Maps.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.slice(0, 8).map((l) => (
                  <tr key={l.id as string} className="border-t border-border">
                    <td className="py-3">{new Date(l.created_at as string).toLocaleString("pt-BR")}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        {l.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
