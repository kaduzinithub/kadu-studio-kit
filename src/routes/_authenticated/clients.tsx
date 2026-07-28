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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clientes — KaduDev Prompt Engine" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    name: "", niche: "", city: "", project_value: "0",
    close_date: "", status: "ativo", domain: "", notes: "",
  });
  const [activity, setActivity] = useState("");

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activities = useQuery({
    queryKey: ["activities", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("client_id", selected!).order("created_at", { ascending: false });
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
      setForm({ name: "", niche: "", city: "", project_value: "0", close_date: "", status: "ativo", domain: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        user_id: user.id, client_id: selected, type: "nota", note: activity,
      });
      if (error) throw error;
    },
    onSuccess: () => { setActivity(""); qc.invalidateQueries({ queryKey: ["activities", selected] }); },
  });

  const selectedClient = clients.data?.find((c) => c.id === selected);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Contratos fechados e timeline de atividades."
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button>+ Novo cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ["name", "Nome"], ["niche", "Nicho"], ["city", "Cidade"], ["project_value", "Valor do projeto"],
                  ["close_date", "Data de fechamento"], ["status", "Status"], ["domain", "Domínio"],
                ] as const).map(([k, l]) => (
                  <div key={k} className="space-y-1.5">
                    <Label>{l}</Label>
                    <Input
                      type={k === "close_date" ? "date" : k === "project_value" ? "number" : "text"}
                      value={(form as never)[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => create.mutate()}>Guardar</Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground text-left">
                <tr>
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Nicho</th>
                  <th className="pb-2">Cidade</th>
                  <th className="pb-2">Valor</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(clients.data ?? []).map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-border cursor-pointer ${selected === c.id ? "bg-muted/40" : "hover:bg-muted/20"}`}
                    onClick={() => setSelected(c.id)}
                  >
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3">{c.niche}</td>
                    <td className="py-3">{c.city}</td>
                    <td className="py-3">{brl.format(Number(c.project_value || 0))}</td>
                    <td className="py-3">{fmtDate(c.close_date as string)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(clients.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum cliente ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-2">Timeline</h3>
          {selectedClient ? (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                {selectedClient.name} · {selectedClient.domain || "sem domínio"}
              </div>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Nova nota…" value={activity} onChange={(e) => setActivity(e.target.value)} />
                <Button onClick={() => activity && addActivity.mutate()}>+</Button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(activities.data ?? []).map((a) => (
                  <div key={a.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(a.created_at as string).toLocaleString("pt-BR")}
                    </div>
                    {a.note}
                  </div>
                ))}
                {(activities.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem atividades.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um cliente para ver a timeline.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
