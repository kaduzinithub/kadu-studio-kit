import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { brl, downloadFile, toCSV } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Download, FileText, TrendingUp, Users, Target, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Relatórios — KaduDev Studios" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [clients, leads, prompts] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("leads").select("*"),
        supabase.from("prompts").select("*"),
      ]);
      return { clients: clients.data ?? [], leads: leads.data ?? [], prompts: prompts.data ?? [] };
    },
  });

  const rows = data?.clients ?? [];
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const receita = rows
      .filter((c) => (c.close_date ?? "").startsWith(key))
      .reduce((s, c) => s + Number(c.project_value || 0), 0);
    return { month: label, receita };
  });

  function exportCsv() {
    const csv = toCSV(
      rows.map((c) => ({
        nome: c.name,
        nicho: c.niche,
        cidade: c.city,
        valor: c.project_value,
        data: c.close_date,
        status: c.status,
        dominio: c.domain,
      })),
    );
    downloadFile(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  function exportXls() {
    const headers = ["Nome", "Nicho", "Cidade", "Valor", "Data", "Status"];
    const body = rows.map((c) => [c.name, c.niche, c.city, c.project_value, c.close_date, c.status]);
    const rowsHtml = [headers, ...body]
      .map((r) => `<tr>${r.map((v) => `<td>${v ?? ""}</td>`).join("")}</tr>`)
      .join("");
    downloadFile("clientes.xls", `<html><body><table border="1">${rowsHtml}</table></body></html>`, "application/vnd.ms-excel");
  }

  function exportPdf() {
    const total = rows.reduce((s, c) => s + Number(c.project_value || 0), 0);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Relatório KaduDev Studios</title>
      <style>
        body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111}
        h1{margin:0 0 8px}.muted{color:#666;margin-bottom:24px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:12px}
        th{background:#f5f5f5}
      </style></head><body>
      <h1>Relatório mensal — KaduDev Studios</h1>
      <div class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
      <p>Total faturado: <b>${brl.format(total)}</b></p>
      <table><thead><tr><th>Nome</th><th>Nicho</th><th>Valor</th><th>Data</th></tr></thead>
      <tbody>${rows.map((c) => `<tr><td>${c.name}</td><td>${c.niche ?? ""}</td><td>${brl.format(Number(c.project_value || 0))}</td><td>${c.close_date ?? ""}</td></tr>`).join("")}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  const totals = {
    receita: rows.reduce((s, c) => s + Number(c.project_value || 0), 0),
    clientes: rows.length,
    leads: (data?.leads ?? []).length,
    prompts: (data?.prompts ?? []).length,
  };
  const conversion = totals.leads ? Math.round((totals.clientes / totals.leads) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Acompanhe faturamento, aquisição e produtividade do seu CRM."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv} className="border-orange-500/15 hover:bg-orange-500/10"><Download className="mr-1 h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={exportXls} className="border-orange-500/15 hover:bg-orange-500/10"><Download className="mr-1 h-4 w-4" /> XLSX</Button>
            <Button onClick={exportPdf} className="bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-black shadow-[0_0_22px_rgba(249,115,22,0.18)] hover:brightness-110"><FileText className="mr-1 h-4 w-4" /> PDF</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Receita total", value: brl.format(totals.receita), icon: TrendingUp, accent: "text-orange-300", bg: "bg-orange-500/10" },
          { label: "Clientes", value: totals.clientes, icon: Users, accent: "text-emerald-300", bg: "bg-emerald-500/10" },
          { label: "Leads", value: totals.leads, icon: Target, accent: "text-amber-300", bg: "bg-amber-500/10" },
          { label: "Conversão", value: `${conversion}%`, icon: Sparkles, accent: "text-orange-300", bg: "bg-orange-500/10" },
        ].map((k) => (
          <Card key={k.label} className="border-orange-500/10 bg-black/25 p-5 shadow-[0_14px_45px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</div>
              </div>
              <div className={`rounded-xl border border-white/10 p-2.5 ${k.bg} ${k.accent}`}><k.icon className="h-4 w-4" /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.08] to-transparent px-5 py-4">
            <div className="font-semibold">Faturamento mensal</div>
            <div className="mt-1 text-xs text-muted-foreground">Últimos 12 meses com base nos clientes fechados.</div>
          </div>
          <div className="h-80 p-4">
            <ResponsiveContainer>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(249,115,22,0.05)" }}
                  contentStyle={{ background: "#090909", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}
                  formatter={(v: number) => brl.format(v)}
                />
                <Bar dataKey="receita" fill="#f97316" radius={[8, 8, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden border-orange-500/10 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-orange-500/10 bg-gradient-to-r from-orange-500/[0.07] to-transparent px-5 py-4">
            <div className="font-semibold">Resumo executivo</div>
            <div className="mt-1 text-xs text-muted-foreground">Visão rápida da operação.</div>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[0.04] p-3">
              <div className="text-xs text-muted-foreground">Ticket médio</div>
              <div className="mt-1 text-lg font-semibold">{brl.format(totals.clientes ? totals.receita / totals.clientes : 0)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="text-xs text-muted-foreground">Prompts gerados</div>
              <div className="mt-1 text-lg font-semibold">{totals.prompts}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
              <div className="text-xs text-muted-foreground">Relação leads → clientes</div>
              <div className="mt-1 text-lg font-semibold">{totals.leads ? `${totals.clientes} / ${totals.leads}` : "0 / 0"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}