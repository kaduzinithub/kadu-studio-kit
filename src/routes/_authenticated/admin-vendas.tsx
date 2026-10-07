import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell";
import { listAccesses, updateAccessContact } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin-vendas")({
  head: () => ({
    meta: [
      { title: "Admin · Vendas — KaduDev Prompt Engine" },
      { name: "description", content: "Acessos vendidos, prazos restantes e cobranças." },
    ],
  }),
  component: SalesPage,
});

const PLAN_LABEL: Record<string, string> = { "1m": "1 mês", "3m": "3 meses", "1y": "1 ano", lifetime: "Vitalício" };
const DAY = 86_400_000;

type Filter = "all" | "soon" | "expired" | "lifetime";

function daysLeft(exp: string | null) {
  if (!exp) return null;
  return Math.ceil((new Date(exp).getTime() - Date.now()) / DAY);
}

function chargeText(name: string, exp: string | null) {
  const d = daysLeft(exp);
  const date = exp ? new Date(exp).toLocaleDateString("pt-BR") : "";
  const when =
    d === null ? "" : d < 0 ? `venceu em ${date}` : d === 0 ? "vence hoje" : `vence em ${d} dia(s), no dia ${date}`;
  return `Olá ${name}! Tudo bem? O seu acesso ao KaduDev Prompt Engine ${when}.\n\nPara continuar a usar sem interrupção, é só renovar. Posso enviar o link de pagamento?`;
}

function SalesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAccesses);
  const update = useServerFn(updateAccessContact);
  const [filter, setFilter] = useState<Filter>("all");
  const [phones, setPhones] = useState<Record<string, string>>({});

  const users = useQuery({ queryKey: ["admin-accesses"], queryFn: () => list() });
  const rows = users.data ?? [];

  const mUpdate = useMutation({
    mutationFn: (v: { id: string; whatsapp?: string; charged?: boolean }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-accesses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const byPlan: Record<string, number> = { "1m": 0, "3m": 0, "1y": 0, lifetime: 0 };
    let active = 0, soon = 0, expired = 0;
    for (const u of rows) {
      byPlan[u.plan] = (byPlan[u.plan] ?? 0) + 1;
      const d = daysLeft(u.expires_at);
      if (d !== null && d < 0) expired++;
      else {
        active++;
        if (d !== null && d <= 7) soon++;
      }
    }
    return { total: rows.length, active, soon, expired, byPlan };
  }, [rows]);

  const sorted = useMemo(() => {
    const f = rows.filter((u) => {
      const d = daysLeft(u.expires_at);
      if (filter === "soon") return d !== null && d >= 0 && d <= 7;
      if (filter === "expired") return d !== null && d < 0;
      if (filter === "lifetime") return d === null;
      return true;
    });
    return f.sort((a, b) => (daysLeft(a.expires_at) ?? 1e9) - (daysLeft(b.expires_at) ?? 1e9));
  }, [rows, filter]);

  function charge(u: (typeof rows)[number]) {
    const name = u.name || u.email.split("@")[0];
    let phone = (phones[u.id] ?? u.whatsapp ?? "").replace(/\D/g, "");
    if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
    const text = encodeURIComponent(chargeText(name, u.expires_at));
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
    mUpdate.mutate({ id: u.id, charged: true });
  }

  return (
    <div className="page-enter">
      <PageHeader title="Vendas e cobranças" description="Acompanhe os acessos vendidos e cobre antes do vencimento." />

      {users.error ? (
        <Card className="p-6 mb-6 text-sm text-destructive">{(users.error as Error).message}</Card>
      ) : null}

      <div className="stagger-grid grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
        {[
          { l: "Acessos vendidos", v: stats.total },
          { l: "Ativos", v: stats.active },
          { l: "Vencem em 7 dias", v: stats.soon },
          { l: "Vencidos", v: stats.expired },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{k.l}</div>
            <div className="font-display text-3xl mt-2">{k.v}</div>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(stats.byPlan).map(([k, v]) => (
          <Badge key={k} variant="secondary">
            {PLAN_LABEL[k] ?? k}: {v}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl italic">Prazos restantes</h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="soon">Vencem em 7 dias</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="lifetime">Vitalícios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {users.isLoading && <div className="p-6 text-sm text-muted-foreground">A carregar…</div>}
          {!users.isLoading && sorted.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Nenhum acesso neste filtro.</div>
          )}
          {sorted.map((u) => {
            const d = daysLeft(u.expires_at);
            const tone = d === null ? "secondary" : d < 0 ? "destructive" : d <= 7 ? "default" : "secondary";
            const label =
              d === null ? "Vitalício" : d < 0 ? `Vencido há ${-d} dia(s)` : d === 0 ? "Vence hoje" : `${d} dia(s) restantes`;
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {u.name || u.email.split("@")[0]}
                    <Badge variant={tone as "default" | "secondary" | "destructive"}>{label}</Badge>
                    <span className="text-xs text-muted-foreground">{PLAN_LABEL[u.plan] ?? u.plan}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.email}
                    {u.expires_at && ` · vence ${new Date(u.expires_at).toLocaleDateString("pt-BR")}`}
                    {u.last_charged_at && ` · cobrado em ${new Date(u.last_charged_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <Input
                  className="h-9 w-[170px]"
                  inputMode="tel"
                  placeholder="WhatsApp (DDD)"
                  value={phones[u.id] ?? u.whatsapp ?? ""}
                  onChange={(e) => setPhones((p) => ({ ...p, [u.id]: e.target.value }))}
                  onBlur={(e) => {
                    if (e.target.value !== (u.whatsapp ?? ""))
                      mUpdate.mutate({ id: u.id, whatsapp: e.target.value });
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  title="Copiar mensagem"
                  onClick={() => {
                    navigator.clipboard.writeText(chargeText(u.name || u.email.split("@")[0], u.expires_at));
                    toast.success("Mensagem copiada");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" disabled={d === null} onClick={() => charge(u)}>
                  <MessageCircle className="h-4 w-4 mr-1" /> Cobrar
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
