import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import { generatePrompt, type BriefingLike } from "@/lib/prompt-templates";
import { downloadFile } from "@/lib/format";
import { Copy, Download, RefreshCw, Save } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({ briefing: z.string().optional() });

export const Route = createFileRoute("/_authenticated/prompts")({
  head: () => ({ meta: [{ title: "Gerador de Prompt — KaduDev Prompt Engine" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PromptsPage,
});

function PromptsPage() {
  const { user } = Route.useRouteContext();
  const { briefing: initialBriefingId } = Route.useSearch();
  const qc = useQueryClient();
  const [selectedBriefing, setSelectedBriefing] = useState<string | undefined>(initialBriefingId);
  const [content, setContent] = useState("");

  const briefings = useQuery({
    queryKey: ["briefings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("briefings").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (BriefingLike & { id: string; company_name: string })[];
    },
  });

  const history = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompts").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const current = useMemo(
    () => briefings.data?.find((b) => b.id === selectedBriefing),
    [briefings.data, selectedBriefing],
  );

  function regenerate() {
    if (!current) return toast.error("Escolha um briefing");
    const p = generatePrompt(current);
    setContent(p);
  }

  useEffect(() => {
    if (current && !content) setContent(generatePrompt(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const save = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("Sem briefing");
      const { error } = await supabase.from("prompts").insert({
        user_id: user.id,
        briefing_id: current.id,
        title: `Prompt — ${current.company_name}`,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prompt guardado no histórico");
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function copy() {
    await navigator.clipboard.writeText(content);
    toast.success("Copiado para a área de transferência");
  }

  return (
    <div>
      <PageHeader
        title="Gerador de Prompt"
        description="Gere prompts profissionais para Lovable, v0, Claude, Cursor ou Bolt."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <label className="text-xs uppercase text-muted-foreground">Briefing</label>
            <Select value={selectedBriefing} onValueChange={(v) => { setSelectedBriefing(v); setContent(""); }}>
              <SelectTrigger><SelectValue placeholder="Escolher briefing" /></SelectTrigger>
              <SelectContent>
                {(briefings.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={regenerate} variant="secondary"><RefreshCw className="h-4 w-4 mr-1" /> Gerar</Button>
              <Button onClick={() => save.mutate()} disabled={!content}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
              <Button onClick={copy} disabled={!content} variant="outline"><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              <Button
                onClick={() => downloadFile(`prompt-${current?.company_name || "kadudev"}.txt`, content)}
                disabled={!content}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-1" /> TXT
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">Histórico</h4>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {(history.data ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setContent(p.content as string)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted"
                >
                  <div className="font-medium truncate">{p.title as string}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at as string).toLocaleString("pt-BR")}
                  </div>
                </button>
              ))}
              {(history.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4">Sem histórico ainda.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>{current ? `Editando: ${current.company_name}` : "Sem briefing selecionado"}</span>
            <span>{content.length} caracteres</span>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="min-h-[70vh] font-mono text-sm bg-muted/30 leading-relaxed"
            placeholder="O prompt gerado aparecerá aqui…"
          />
        </Card>
      </div>
    </div>
  );
}
