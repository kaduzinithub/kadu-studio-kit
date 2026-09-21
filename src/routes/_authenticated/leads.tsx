import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — KaduDev Prompt Engine" }] }),
  component: LeadsPage,
});

const STATUSES = [
  "novo",
  "contactado",
  "respondeu",
  "reuniao",
  "proposta",
  "fechado",
  "perdido",
] as const;
const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contactado: "Contactado",
  respondeu: "Respondeu",
  reuniao: "Reunião",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

function LeadsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("todos");

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const items = leads.data ?? [];
    return items.filter((l) => {
      const okSearch =
        !search ||
        [l.name, l.contact, l.whatsapp, l.city, l.niche, l.notes].some(
          (v) => v && (v as string).toLowerCase().includes(search.toLowerCase()),
        );
      const okStatus = filter === "todos" || l.status === filter;
      return okSearch && okStatus;
    });
  }, [leads.data, search, filter]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const createLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("leads")
        .insert({ user_id: user.id, name: "Novo lead", status: "novo" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <div>
      <PageHeader
        title="Leads (CRM)"
        description="Gerencie o pipeline de prospeção."
        actions={<Button onClick={() => createLead.mutate()}>+ Novo lead</Button>}
      />

      <Tabs defaultValue="tabela">
        <TabsList>
          <TabsTrigger value="tabela">Tabela</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="tabela">
          <Card className="p-4 mt-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <Input
                placeholder="Pesquisar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os estados</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-2">Nome</th>
                    <th className="pb-2">Nicho</th>
                    <th className="pb-2">Cidade</th>
                    <th className="pb-2">WhatsApp</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-3 font-medium">{l.name}</td>
                      <td className="py-3">{l.niche}</td>
                      <td className="py-3">{l.city}</td>
                      <td className="py-3">{l.whatsapp}</td>
                      <td className="py-3">
                        <Select
                          value={l.status}
                          onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v })}
                        >
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => deleteLead.mutate(l.id)}>
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum lead encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid gap-3 mt-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {STATUSES.map((s) => (
              <Card
                key={s}
                className={cn("p-3 min-h-[300px]")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("id");
                  if (id) updateStatus.mutate({ id, status: s });
                }}
              >
                <div className="text-xs uppercase text-muted-foreground mb-2 flex items-center justify-between">
                  <span>{STATUS_LABEL[s]}</span>
                  <span>{(leads.data ?? []).filter((l) => l.status === s).length}</span>
                </div>
                <div className="space-y-2">
                  {(leads.data ?? [])
                    .filter((l) => l.status === s)
                    .map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("id", l.id)}
                        className="rounded-xl border border-border bg-muted/40 p-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.niche} · {l.city}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
