import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";
import { Building2, CalendarDays, DollarSign, Search, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clientes — KaduDev Studios" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    niche: "",
    city: "",
    project_value: "0",
    close_date: "",
    status: "ativo",
    domain: "",
    notes: "",
  });
  const [activity, setActivity] = useState("");

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activities = useQuery({
    queryKey: ["activities", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("client_id", selected!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({
        user_id: user.id,
        ...form,
        project_value: Number(form.project_value || 0),
        close_date: form.close_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente adicionado");
      setOpenNew(false);
      setForm({
        name: "",
        niche: "",
        city: "",
        project_value: "0",
        close_date: "",
        status: "ativo",
        domain: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        user_id: user.id,
        client_id: selected,
        type: "nota",
        note: activity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setActivity("");
      qc.invalidateQueries({ queryKey: ["activities", selected] });
    },
  });

  const filteredClients = (clients.data ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.niche, c.city, c.domain, c.status].some((value) =>
      String(value ?? "").toLowerCase().includes(q),
    );
  });

  const totalValue = filteredClients.reduce(
    (sum, c) => sum + Number(c.project_value || 0),
    0,
  );
  const activeCount = filteredClients.filter((c) => c.status === "ativo").length;

  const selectedClient = clients.data?.find((c) => c.id === selected);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Sua carteira de clientes, projetos e histórico em um só lugar."
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.2)] hover:brightness-110">
                + Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="border-orange-500/15 bg-zinc-950 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
              <DialogHeader>
                <DialogTitle className="text-lg">Novo cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    ["name", "Nome"],
                    ["niche", "Nicho"],
                    ["city", "Cidade"],
                    ["project_value", "Valor do projeto"],
                    ["close_date", "Data de fechamento"],
                    ["status", "Status"],
                    ["domain", "Domínio"],
                  ] as const
                ).map(([k, l]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{l}</Label>
                    <Input
                      type={k === "close_date" ? "date" : k === "project_value" ? "number" : "text"}
                      value={(form as never)[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="border-white/10 bg-black/25 focus:border-orange-500/40"
                    />
                  </div>
                ))}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="border-white/10 bg-black/25 focus:border-orange-500/40"
                  />
                </div>
              </div>
              <Button
                onClick={() => create.mutate()}
                className="bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black"
              >
                Guardar cliente
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-orange-500/10 bg-black/25 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-orange-500/15 bg-orange-500/10 p-2.5 text-orange-300"><UserRound className="h-4 w-4" /></div>
            <div><div className="text-xs text-muted-foreground">Clientes</div><div className="text-xl font-semibold">{filteredClients.length}</div></div>
          </div>
        </Card>
        <Card className="border-orange-500/10 bg-black/25 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-2.5 text-emerald-300"><Building2 className="h-4 w-4" /></div>
            <div><div className="text-xs text-muted-foreground">Ativos</div><div className="text-xl font-semibold">{activeCount}</div></div>
          </div>
        </Card>
        <Card className="border-orange-500/10 bg-black/25 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-300"><DollarSign className="h-4 w-4" /></div>
            <div><div className="text-xs text-muted-foreground">Valor da carteira</div><div className="text-xl font-semibold">{brl.format(totalValue)}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] to-transparent p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="font-semibold">Carteira de clientes</div>
                <div className="text-xs text-muted-foreground">Selecione um cliente para abrir o histórico.</div>
              </div>
              <div className="relative sm:ml-auto sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente…"
                  className="border-white/10 bg-black/25 pl-9 focus:border-orange-500/40"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-3">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 pb-3">Cliente</th>
                  <th className="px-3 pb-3">Nicho</th>
                  <th className="px-3 pb-3">Cidade</th>
                  <th className="px-3 pb-3">Valor</th>
                  <th className="px-3 pb-3">Fechamento</th>
                  <th className="px-3 pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    className={`cursor-pointer border-t border-white/[0.06] transition-colors ${
                      selected === c.id
                        ? "bg-orange-500/[0.08]"
                        : "hover:bg-white/[0.025]"
                    }`}
                    onClick={() => setSelected(c.id)}
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold ${
                          selected === c.id
                            ? "border-orange-400/30 bg-orange-500/15 text-orange-300"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground"
                        }`}>
                          {(c.name || "N").slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{c.niche || "—"}</td>
                    <td className="px-3 py-3.5 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-3 py-3.5 font-medium">{brl.format(Number(c.project_value || 0))}</td>
                    <td className="px-3 py-3.5 text-muted-foreground">{fmtDate(c.close_date as string)}</td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-2.5 py-1 text-xs text-emerald-300">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] to-transparent p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-300" />
              <div>
                <div className="font-semibold">Timeline</div>
                <div className="text-xs text-muted-foreground">Histórico e anotações do cliente.</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {selectedClient ? (
              <>
                <div className="mb-4 rounded-xl border border-orange-500/10 bg-orange-500/[0.04] p-3">
                  <div className="text-sm font-medium">{selectedClient.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{selectedClient.domain || "Sem domínio cadastrado"}</div>
                </div>
                <div className="mb-4 flex gap-2">
                  <Input
                    placeholder="Adicionar uma nota…"
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="border-white/10 bg-black/20 focus:border-orange-500/40"
                  />
                  <Button
                    onClick={() => activity.trim() && addActivity.mutate()}
                    className="bg-orange-500 text-black hover:bg-orange-400"
                  >
                    +
                  </Button>
                </div>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                  {(activities.data ?? []).map((a) => (
                    <div key={a.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {new Date(a.created_at as string).toLocaleString("pt-BR")}
                      </div>
                      <div className="text-zinc-300">{a.note}</div>
                    </div>
                  ))}
                  {(activities.data ?? []).length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Sem atividades registradas.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center text-center">
                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/15 bg-orange-500/[0.06] text-orange-300">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">Selecione um cliente</div>
                  <p className="mt-1 text-xs text-muted-foreground">A timeline aparecerá aqui.</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
