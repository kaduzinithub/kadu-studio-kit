import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app-shell";
import { listAccesses, listCharges, addCharge, deleteCharge, updateAccessContact } from "@/lib/admin.functions";
import { brl, fmtDate } from "@/lib/format";

type Plan = "1m" | "3m" | "1y" | "lifetime";
const PLAN_LABEL: Record<Plan, string> = { "1m": "1 mês", "3m": "3 meses", "1y": "1 ano", lifetime: "Vitalício" };

export const Route = createFileRoute("/_authenticated/admin-clientes")({
  head: () => ({
    meta: [
      { title: "Admin · Clientes — KaduDev Prompt Engine" },
      { name: "description", content: "Dados completos de cada cliente: contato, plano e histórico de cobranças." },
    ],
  }),
  component: AdminClientesPage,
});

function ChargesPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCharges);
  const addFn = useServerFn(addCharge);
  const delFn = useServerFn(deleteCharge);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const charges = useQuery({
    queryKey: ["admin-charges", userId],
    queryFn: () => listFn({ data: { id: userId } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-charges", userId] });

  const mAdd = useMutation({
    mutationFn: () => addFn({ data: { id: userId, amount: Number(amount.replace(",", ".")) || 0, note } }),
    onSuccess: () => {
      setAmount("");
      setNote("");
      toast.success("Cobrança registada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (chargeId: string) => delFn({ data: { chargeId } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (charges.data ?? []).reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Histórico de cobranças</h3>
        <span className="text-xs text-white/40">Total cobrado: <span className="font-semibold text-orange-300">{brl.format(total)}</span></span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor (ex.: 97,00)"
          className="h-9 w-[150px]"
          inputMode="decimal"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (ex.: mensalidade outubro)"
          className="h-9 min-w-[200px] flex-1"
        />
        <Button size="sm" disabled={!amount || mAdd.isPending} onClick={() => mAdd.mutate()}>
          <Plus className="mr-1 h-4 w-4" /> Registar
        </Button>
      </div>

      {charges.isLoading && <p className="text-xs text-white/35">A carregar…</p>}
      {charges.data?.length === 0 && <p className="text-xs text-white/35">Nenhuma cobrança registada.</p>}
      <div className="divide-y divide-white/[0.05]">
        {charges.data?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="font-medium text-white/85">{brl.format(Number(c.amount))}</span>
            <span className="flex-1 truncate text-white/40">{c.note || "—"}</span>
            <span className="text-xs text-white/30">{fmtDate(c.charged_at)}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/30 hover:text-red-400"
              title="Apagar cobrança"
              onClick={() => mDel.mutate(c.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminClientesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccesses);
  const contactFn = useServerFn(updateAccessContact);
  const [open, setOpen] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["admin-accesses"], queryFn: () => listFn() });

  const mWhatsapp = useMutation({
    mutationFn: (v: { id: string; whatsapp: string }) => contactFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-accesses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-enter">
      <PageHeader
        title="Clientes"
        description="Dados completos de cada cliente: contato, plano e histórico de cobranças."
      />

      {users.error ? (
        <Card className="p-6 text-sm text-destructive">{(users.error as Error).message}</Card>
      ) : null}

      <div className="space-y-4">
        {users.isLoading && <Card className="p-6 text-sm text-muted-foreground">A carregar…</Card>}
        {users.data?.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">Nenhum cliente com acesso liberado ainda.</Card>
        )}
        {users.data?.map((u) => {
          const expired = !!u.expires_at && new Date(u.expires_at) < new Date();
          const isOpen = open === u.id;
          return (
            <Card key={u.id} className="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {u.name || u.email.split("@")[0]}
                    {u.banned && <Badge variant="destructive">Bloqueado</Badge>}
                    {expired ? (
                      <Badge variant="destructive">Vencido</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {u.expires_at ? `Vence ${fmtDate(u.expires_at)}` : "Vitalício"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{u.email}</div>
                </div>

                <div className="text-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Plano</div>
                  <div className="text-white/80">{PLAN_LABEL[(u.plan as Plan) ?? "lifetime"]}</div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Valor pago</div>
                  <div className="text-white/80">{u.price_paid != null ? brl.format(Number(u.price_paid)) : "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Última cobrança</div>
                  <div className="text-white/80">{fmtDate(u.last_charged_at)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={u.whatsapp}
                    placeholder="WhatsApp"
                    className="h-9 w-[150px]"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (u.whatsapp ?? "")) mWhatsapp.mutate({ id: u.id, whatsapp: v });
                    }}
                  />
                  {u.whatsapp && (
                    <Button size="sm" variant="outline" asChild title="Abrir WhatsApp">
                      <a
                        href={`https://wa.me/${u.whatsapp.replace(/\D/g, "").length <= 11 ? "55" : ""}${u.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : u.id)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="ml-1">Cobranças</span>
                  </Button>
                </div>
              </div>

              {isOpen && <ChargesPanel userId={u.id} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
