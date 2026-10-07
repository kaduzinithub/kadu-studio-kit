import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app-shell";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin-precos")({
  head: () => ({
    meta: [
      { title: "Admin · Preços — KaduDev Prompt Engine" },
      { name: "description", content: "Defina o valor de cada plano de acesso." },
    ],
  }),
  component: PricesPage,
});

const PLANS = [
  { key: "1m", label: "1 mês" },
  { key: "3m", label: "3 meses" },
  { key: "1y", label: "1 ano" },
  { key: "lifetime", label: "Vitalício" },
] as const;

function PricesPage() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["plan-prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_prices").select("plan, price");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.plan, Number(p.price)])) as Record<string, number>;
    },
  });

  useEffect(() => {
    if (q.data) setValues(Object.fromEntries(Object.entries(q.data).map(([k, v]) => [k, String(v)])));
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = PLANS.map((p) => {
        const n = Number(String(values[p.key] ?? "0").replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error(`Valor inválido em ${p.label}`);
        return { plan: p.key, price: n, updated_at: new Date().toISOString() };
      });
      const { error } = await supabase.from("plan_prices").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preços guardados");
      qc.invalidateQueries({ queryKey: ["plan-prices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-enter">
      <PageHeader title="Preços dos planos" description="O valor de cada plano entra no total faturado em Vendas." />
      {q.error ? <Card className="p-6 mb-6 text-sm text-destructive">Acesso restrito ao administrador.</Card> : null}
      <Card className="p-6 max-w-xl space-y-5">
        {PLANS.map((p) => (
          <div key={p.key} className="flex items-center gap-4">
            <Label className="w-28">{p.label}</Label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                className="pl-10"
                inputMode="decimal"
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
              />
            </div>
            <span className="w-28 text-right text-sm text-muted-foreground">
              {brl.format(Number(String(values[p.key] ?? "0").replace(",", ".")) || 0)}
            </span>
          </div>
        ))}
        <Button className="w-full" disabled={save.isPending || q.isLoading} onClick={() => save.mutate()}>
          {save.isPending ? "A guardar…" : "Guardar preços"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Novos acessos e renovações guardam o preço do momento da venda. Acessos antigos usam o preço atual.
        </p>
      </Card>
    </div>
  );
}
