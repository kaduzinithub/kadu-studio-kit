import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { brl, downloadFile, toCSV } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Relatórios — KaduDev Prompt Engine" }] }),
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
      (data?.clients ?? []).map((c) => ({
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
    // XML Excel simples
    const headers = ["Nome", "Nicho", "Cidade", "Valor", "Data", "Status"];
    const body = (data?.clients ?? []).map((c) => [
      c.name,
      c.niche,
      c.city,
      c.project_value,
      c.close_date,
      c.status,
    ]);
    const rowsHtml = [headers, ...body]
      .map((r) => `<tr>${r.map((v) => `<td>${v ?? ""}</td>`).join("")}</tr>`)
      .join("");
    const html = `<html><body><table border="1">${rowsHtml}</table></body></html>`;
    downloadFile(`clientes.xls`, html, "application/vnd.ms-excel");
  }
  function exportPdf() {
    const total = rows.reduce((s, c) => s + Number(c.project_value || 0), 0);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Relatório KaduDev</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111}
      h1{margin:0 0 8px} .muted{color:#666;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:12px}
      th{background:#f5f5f5}</style></head><body>
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

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Exporte dados e visualize a faturação."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" onClick={exportXls}>
              <Download className="h-4 w-4 mr-1" /> XLSX
            </Button>
            <Button onClick={exportPdf}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { l: "Receita total", v: brl.format(totals.receita) },
          { l: "Clientes", v: totals.clientes },
          { l: "Leads", v: totals.leads },
          { l: "Prompts", v: totals.prompts },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{k.l}</div>
            <div className="text-2xl font-semibold mt-2">{k.v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Faturação mensal (12 meses)</h3>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => brl.format(v)}
              />
              <Bar dataKey="receita" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
