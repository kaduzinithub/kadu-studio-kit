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
import {
  Users,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Briefcase,
  MapPin,
  ArrowUpRight,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — KaduDev Studios" }],
  }),
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
        supabase
          .from("clients")
          .select(
            "id,project_value,close_date,status,niche,name,city,created_at",
          ),
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
      <div className="space-y-8">
        <div>
          <div className="h-9 w-48 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-white/[0.035]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[130px] rounded-2xl border border-white/[0.05] bg-white/[0.025]"
            />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-[350px] rounded-2xl bg-white/[0.025]" />
          <Skeleton className="h-[350px] rounded-2xl bg-white/[0.025]" />
        </div>
      </div>
    );
  }

  const today = new Date().toDateString();
  const monthKey = new Date().toISOString().slice(0, 7);

  const leadsHoje = data.leads.filter(
    (l) => new Date(l.created_at as string).toDateString() === today,
  ).length;

  const leadsMes = data.leads.filter((l) =>
    (l.created_at as string).startsWith(monthKey),
  ).length;

  const closed = data.clients.filter(
    (c) => c.status === "fechado" || c.close_date,
  );

  const receitaMes = closed
    .filter((c) => (c.close_date ?? "").startsWith(monthKey))
    .reduce((s, c) => s + Number(c.project_value || 0), 0);

  const vendasFechadas = closed.length;

  const taxaConversao =
    data.leads.length > 0
      ? Math.round((vendasFechadas / data.leads.length) * 100)
      : 0;

  // Leads por dia — últimos 14 dias
  const leadsPorDia = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();

    d.setDate(d.getDate() - (13 - i));

    const key = d.toISOString().slice(0, 10);

    const label = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    return {
      day: label,
      leads: data.leads.filter(
        (l) => (l.created_at as string).slice(0, 10) === key,
      ).length,
    };
  });

  // Clientes por nicho
  const byNiche = new Map<string, number>();

  for (const c of data.clients) {
    const niche = c.niche || "Outros";

    byNiche.set(niche, (byNiche.get(niche) ?? 0) + 1);
  }

  const nichoData = [...byNiche.entries()]
    .map(([niche, total]) => ({
      niche,
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const cards = [
    {
      label: "Leads hoje",
      value: leadsHoje,
      icon: MapPin,
      description: "Novos contatos",
    },
    {
      label: "Leads no mês",
      value: leadsMes,
      icon: Users,
      description: "Pipeline atual",
    },
    {
      label: "Prompts gerados",
      value: data.prompts.length,
      icon: Sparkles,
      description: "Produção de IA",
    },
    {
      label: "Mensagens",
      value: data.messages.length,
      icon: MessageSquare,
      description: "Mensagens criadas",
    },
    {
      label: "Vendas fechadas",
      value: vendasFechadas,
      icon: Briefcase,
      description: "Clientes convertidos",
    },
    {
      label: "Receita mensal",
      value: brl.format(receitaMes),
      icon: TrendingUp,
      description: "Volume no mês",
      highlight: true,
    },
  ];

  return (
    <div className="relative space-y-7">
      {/* Ambient dashboard glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[0.035] blur-[100px]" />

      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação KaduDev Studios."
      />

      {/* Quick status */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/[0.12] bg-gradient-to-r from-orange-500/[0.07] via-orange-500/[0.025] to-transparent px-5 py-4">
        <div className="absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-orange-500/[0.05] to-transparent" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10">
              <Activity className="h-4 w-4 text-orange-400" />
            </div>

            <div>
              <div className="text-xs font-semibold text-white/75">
                Operação ativa
              </div>

              <div className="mt-0.5 text-[11px] text-white/35">
                Seus dados estão sendo monitorados em tempo real.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-orange-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,120,30,0.9)]" />
            Sistema operacional
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stagger-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, index) => {
          const Icon = c.icon;

          return (
            <Card
              key={c.label}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/20 hover:bg-[#120c08]",
                c.highlight &&
                  "border-orange-500/[0.18] bg-gradient-to-br from-orange-500/[0.08] to-transparent",
              )}
              style={{
                animationDelay: `${index * 55}ms`,
              }}
            >
              {/* Glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-orange-500/[0.06] blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block truncate text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">
                    {c.label}
                  </span>

                  <div className="mt-3 truncate text-[24px] font-semibold tracking-tight text-white">
                    {c.value}
                  </div>

                  <div className="mt-1 text-[10px] text-white/25">
                    {c.description}
                  </div>
                </div>

                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] transition-all duration-300 group-hover:border-orange-500/20 group-hover:bg-orange-500/10",
                    c.highlight &&
                      "border-orange-500/20 bg-orange-500/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[16px] w-[16px] text-white/35 transition-colors duration-300 group-hover:text-orange-400",
                      c.highlight && "text-orange-400",
                    )}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.018] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/[0.08]">
            <Target className="h-4 w-4 text-orange-400" />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              Conversão
            </div>

            <div className="mt-0.5 text-lg font-semibold text-white">
              {taxaConversao}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.018] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/[0.08]">
            <Zap className="h-4 w-4 text-orange-400" />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              Produção
            </div>

            <div className="mt-0.5 text-lg font-semibold text-white">
              {data.prompts.length + data.messages.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.018] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/[0.08]">
            <Briefcase className="h-4 w-4 text-orange-400" />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              Clientes
            </div>

            <div className="mt-0.5 text-lg font-semibold text-white">
              {data.clients.length}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Leads chart */}
        <Card className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 p-6 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-orange-500/[0.035] blur-[70px]" />

          <div className="relative mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,120,30,0.8)]" />
                <h3 className="text-sm font-semibold text-white/85">
                  Geração de leads
                </h3>
              </div>

              <p className="mt-1 text-[11px] text-white/30">
                Evolução dos últimos 14 dias
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/30">
              14 dias
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={leadsPorDia}
                margin={{
                  top: 5,
                  right: 5,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.045)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />

                <YAxis
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <Tooltip
                  cursor={{
                    stroke: "rgba(255,120,30,0.15)",
                  }}
                  contentStyle={{
                    background: "#100b08",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "#fff",
                    boxShadow: "0 15px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 11,
                  }}
                  itemStyle={{
                    color: "#fb923c",
                    fontSize: 12,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#f97316",
                    stroke: "#1a0e06",
                    strokeWidth: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Niche chart */}
        <Card className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 p-6 backdrop-blur-xl">
          <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-orange-500/[0.035] blur-[70px]" />

          <div className="relative mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,120,30,0.8)]" />
                <h3 className="text-sm font-semibold text-white/85">
                  Clientes por nicho
                </h3>
              </div>

              <p className="mt-1 text-[11px] text-white/30">
                Distribuição da sua carteira
              </p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
              <Briefcase className="h-3.5 w-3.5 text-white/30" />
            </div>
          </div>

          <div className="h-64">
            {nichoData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Briefcase className="mx-auto h-7 w-7 text-white/15" />

                  <p className="mt-3 text-xs text-white/30">
                    Ainda não há clientes cadastrados.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={nichoData}
                  margin={{
                    top: 5,
                    right: 5,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.045)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="niche"
                    stroke="rgba(255,255,255,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />

                  <YAxis
                    stroke="rgba(255,255,255,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(255,120,30,0.035)",
                    }}
                    contentStyle={{
                      background: "#100b08",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "#fff",
                      boxShadow: "0 15px 50px rgba(0,0,0,0.45)",
                    }}
                    labelStyle={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 11,
                    }}
                    itemStyle={{
                      color: "#fb923c",
                      fontSize: 12,
                    }}
                  />

                  <Bar
                    dataKey="total"
                    fill="#f97316"
                    radius={[7, 7, 2, 2]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent leads */}
      <Card className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-500/[0.025] blur-[70px]" />

        <div className="relative flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white/85">
                Leads recentes
              </h3>

              <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] font-medium text-white/25">
                {Math.min(data.leads.length, 8)}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-white/30">
              Últimos contatos adicionados à operação
            </p>
          </div>

          <Link
            to="/leads"
            className="group flex items-center gap-1 text-[11px] font-medium text-orange-400/70 transition-colors hover:text-orange-300"
          >
            Ver todos
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {data.leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025]">
              <Users className="h-5 w-5 text-white/20" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/60">
              Nenhum lead encontrado
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-white/25">
              Comece sua prospecção pela página Empresas / Maps para
              encontrar novos potenciais clientes.
            </p>

            <Link
              to="/companies"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.08] px-4 py-2.5 text-xs font-semibold text-orange-300 transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.13]"
            >
              <MapPin className="h-3.5 w-3.5" />
              Encontrar empresas
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.045] text-left">
                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Data
                  </th>

                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Status
                  </th>

                  <th className="hidden px-6 py-3 text-right text-[9px] font-bold uppercase tracking-[0.13em] text-white/25 sm:table-cell">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.leads.slice(0, 8).map((l) => (
                  <tr
                    key={l.id as string}
                    className="group border-b border-white/[0.035] transition-colors last:border-0 hover:bg-white/[0.018]"
                  >
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-white/65">
                        {new Date(
                          l.created_at as string,
                        ).toLocaleDateString("pt-BR")}
                      </div>

                      <div className="mt-0.5 text-[10px] text-white/25">
                        {new Date(
                          l.created_at as string,
                        ).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/15 bg-orange-500/[0.07] px-2.5 py-1 text-[10px] font-semibold text-orange-300">
                        <span className="h-1 w-1 rounded-full bg-orange-400" />
                        {l.status as string}
                      </span>
                    </td>

                    <td className="hidden px-6 py-4 text-right sm:table-cell">
                      <Link
                        to="/leads"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-white/[0.05] hover:text-orange-300"
                        aria-label="Ver leads"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
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
