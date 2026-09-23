import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import type { BriefingLike } from "@/lib/prompt-templates";
import { buildPreviewHtml, type GeneratedSite } from "@/lib/site-generator";
import { editGeneratedSite, generateSite } from "@/site-generator.functions";
import { downloadFile } from "@/lib/format";
import {
  Code2,
  Download,
  ExternalLink,
  Eye,
  Link2,
  MessageCircle,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";

import { z } from "zod";

const searchSchema = z.object({ briefing: z.string().optional() });
const emptyFiles: GeneratedSite["files"] = { "index.html": "", "styles.css": "", "script.js": "" };
type SiteRow = {
  id: string;
  title: string;
  briefing_id: string | null;
  files: GeneratedSite["files"];
  preview_html: string;
  prompt: string;
  created_at: string;
  share_slug: string;
  is_public: boolean;
};


export const Route = createFileRoute("/_authenticated/prompts")({
  head: () => ({ meta: [{ title: "Sites com IA — KaduDev Prompt Engine" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PromptsPage,
});

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "site-kadudev"
  );
}

function PromptsPage() {
  const { user } = Route.useRouteContext();
  const { briefing: initialBriefingId } = Route.useSearch();
  const qc = useQueryClient();
  const [selectedBriefing, setSelectedBriefing] = useState<string | undefined>(initialBriefingId);
  const [activeSite, setActiveSite] = useState<SiteRow | null>(null);
  const [files, setFiles] = useState<GeneratedSite["files"]>(emptyFiles);
  const [title, setTitle] = useState("");
  const [siteRequest, setSiteRequest] = useState("");
  const [editRequest, setEditRequest] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const briefings = useQuery({
    queryKey: ["briefings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (BriefingLike & { id: string; company_name: string })[];
    },
  });
  const sites = useQuery({
    queryKey: ["generated-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_sites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as SiteRow[];
    },
  });
  const currentBriefing = useMemo(
    () => briefings.data?.find((b) => b.id === selectedBriefing),
    [briefings.data, selectedBriefing],
  );
  const previewHtml = useMemo(() => (files["index.html"] ? buildPreviewHtml(files) : ""), [files]);
  function loadSite(site: SiteRow) {
    setActiveSite(site);
    setSelectedBriefing(site.briefing_id ?? undefined);
    setTitle(site.title);
    setFiles(site.files);
  }
  useEffect(() => {
    if (!activeSite && sites.data?.[0]) loadSite(sites.data[0]);
  }, [sites.data, activeSite]);

  const create = useMutation({
    mutationFn: async () => {
      if (!selectedBriefing) throw new Error("Escolha um briefing antes de criar o site.");
      return generateSite({
        data: { briefingId: selectedBriefing, request: siteRequest },
      }) as unknown as Promise<SiteRow>;
    },
    onSuccess: (site) => {
      loadSite(site);
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
      toast.success("Site criado e salvo como uma nova versão.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar o site."),
  });
  const editWithAi = useMutation({
    mutationFn: async () => {
      if (!activeSite) throw new Error("Carregue uma versão antes de pedir uma edição.");
      return editGeneratedSite({
        data: { siteId: activeSite.id, request: editRequest },
      }) as unknown as Promise<SiteRow>;
    },
    onSuccess: (site) => {
      loadSite(site);
      setEditRequest("");
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
      toast.success("Edição criada e salva como uma nova versão.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível editar o site."),
  });
  const saveVersion = useMutation({
    mutationFn: async () => {
      if (!selectedBriefing || !files["index.html"].trim())
        throw new Error("Crie ou carregue um site antes de salvar.");
      const { data, error } = await supabase
        .from("generated_sites")
        .insert({
          user_id: user.id,
          briefing_id: selectedBriefing,
          title: title || currentBriefing?.company_name || "Site sem título",
          prompt: activeSite?.prompt ?? "Edição manual",
          files,
          preview_html: previewHtml,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SiteRow;
    },
    onSuccess: (site) => {
      loadSite(site);
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
      toast.success("Nova versão salva no histórico.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });
  const publish = useMutation({
    mutationFn: async (makePublic: boolean) => {
      if (!activeSite) throw new Error("Carregue uma versão antes de gerar o link.");
      const { data, error } = await supabase
        .from("generated_sites")
        .update({ is_public: makePublic, preview_html: previewHtml })
        .eq("id", activeSite.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SiteRow;
    },
    onSuccess: (site) => {
      setActiveSite(site);
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
      toast.success(site.is_public ? "Link público ativado." : "Link desativado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível publicar."),
  });
  const shareUrl = activeSite && origin ? `${origin}/s/${activeSite.share_slug}` : "";
  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado. É só enviar ao cliente.");
  }
  function sendOnWhatsapp() {
    if (!shareUrl) return;
    const text = `Olá! Preparei uma prévia do site: ${activeSite?.title ?? ""}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function openPreview() {
    if (!previewHtml) return;
    const url = URL.createObjectURL(new Blob([previewHtml], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  function download() {
    if (!files["index.html"]) return;
    const base = safeFileName(title || currentBriefing?.company_name || "site-kadudev");
    downloadFile(`${base}-index.html`, files["index.html"], "text/html;charset=utf-8");
    downloadFile(`${base}-styles.css`, files["styles.css"], "text/css;charset=utf-8");
    downloadFile(`${base}-script.js`, files["script.js"], "text/javascript;charset=utf-8");
    toast.success("Os três arquivos do site foram baixados.");
  }

  return (
    <div>
      <PageHeader
        title="Sites com IA"
        description="Briefing → site completo → preview → edição → versões."
        actions={
          <Button onClick={() => create.mutate()} disabled={!selectedBriefing || create.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {create.isPending ? "Criando…" : "Criar site com IA"}
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="space-y-3 p-4">
            <label className="text-xs uppercase text-muted-foreground">Briefing para gerar</label>
            <Select value={selectedBriefing} onValueChange={setSelectedBriefing}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher briefing" />
              </SelectTrigger>
              <SelectContent>
                {(briefings.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A geração usa apenas as informações preenchidas neste briefing.
            </p>
            <Textarea
              value={siteRequest}
              onChange={(event) => setSiteRequest(event.target.value)}
              placeholder="Descreva seu site ou acrescente instruções…"
              className="min-h-28 text-sm"
            />
          </Card>
          <Card className="p-3">
            <h2 className="px-2 pb-2 text-xs uppercase text-muted-foreground">
              Histórico de versões
            </h2>
            <div className="max-h-[58vh] space-y-1 overflow-y-auto">
              {(sites.data ?? []).map((site) => (
                <button
                  key={site.id}
                  onClick={() => loadSite(site)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${activeSite?.id === site.id ? "bg-primary/10 text-primary" : ""}`}
                >
                  <span className="block truncate font-medium">{site.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(site.created_at).toLocaleString("pt-BR")}
                  </span>
                </button>
              ))}
              {sites.data?.length === 0 && (
                <p className="px-2 py-4 text-xs text-muted-foreground">Nenhuma versão ainda.</p>
              )}
            </div>
          </Card>
        </aside>
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <Button
              variant="secondary"
              onClick={() => create.mutate()}
              disabled={!selectedBriefing || create.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("site-preview")?.scrollIntoView({ behavior: "smooth" })
              }
              disabled={!previewHtml}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={openPreview} disabled={!previewHtml}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Nova aba
            </Button>
            <Button variant="outline" onClick={download} disabled={!previewHtml}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              className="ml-auto"
              onClick={() => saveVersion.mutate()}
              disabled={saveVersion.isPending || !previewHtml}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar versão
            </Button>
          </Card>
          <Card className="space-y-3 p-4">
            <label className="text-xs uppercase text-muted-foreground">Editar com IA</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={editRequest}
                onChange={(event) => setEditRequest(event.target.value)}
                placeholder="Ex.: Deixe o botão principal laranja e aumente o título."
                className="min-h-20 flex-1 text-sm"
              />
              <Button
                variant="secondary"
                onClick={() => editWithAi.mutate()}
                disabled={!activeSite || editRequest.trim().length < 3 || editWithAi.isPending}
              >
                {editWithAi.isPending ? "Editando…" : "Aplicar edição"}
              </Button>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <input
                aria-label="Título do site"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do site"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              />
            </div>
            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <Editor
                  value={files["index.html"]}
                  onChange={(value) => setFiles({ ...files, "index.html": value })}
                />
              </TabsContent>
              <TabsContent value="css">
                <Editor
                  value={files["styles.css"]}
                  onChange={(value) => setFiles({ ...files, "styles.css": value })}
                />
              </TabsContent>
              <TabsContent value="js">
                <Editor
                  value={files["script.js"]}
                  onChange={(value) => setFiles({ ...files, "script.js": value })}
                />
              </TabsContent>
            </Tabs>
          </Card>
          <Card id="site-preview" className="overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">
              Preview isolado
            </div>
            {previewHtml ? (
              <iframe
                title="Preview do site gerado"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-forms allow-popups"
                className="h-[680px] w-full bg-white"
              />
            ) : (
              <div className="p-14 text-center text-sm text-muted-foreground">
                Selecione um briefing e crie seu primeiro site.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Editor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      className="mt-3 min-h-[390px] resize-y bg-muted/30 font-mono text-xs leading-relaxed"
      placeholder="O código gerado aparecerá aqui…"
    />
  );
}
