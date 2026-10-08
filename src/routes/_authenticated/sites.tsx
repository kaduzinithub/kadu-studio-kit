import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, Globe2, Link2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Site = {
  id: string;
  title: string;
  created_at: string;
  share_slug: string | null;
  is_public: boolean;
  preview_html: string | null;
  briefing_id: string | null;
};

export const Route = createFileRoute("/_authenticated/sites")({
  head: () => ({ meta: [{ title: "Sites — KaduDev Studios" }] }),
  component: SitesPage,
});

function SitesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const sites = useQuery({
    queryKey: ["sites-workspace", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_sites")
        .select("id,title,created_at,share_slug,is_public,preview_html,briefing_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Site[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites.data ?? [];
    return (sites.data ?? []).filter((site) => site.title.toLowerCase().includes(q));
  }, [sites.data, search]);

  const updateSite = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("generated_sites")
        .update(input.patch)
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id,title,created_at,share_slug,is_public,preview_html,briefing_id")
        .single();
      if (error) throw error;
      return data as Site;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-workspace", user.id] });
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o site."),
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generated_sites").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-workspace", user.id] });
      qc.invalidateQueries({ queryKey: ["generated-sites"] });
      toast.success("Site removido.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível remover o site."),
  });

  function publicUrl(site: Site) {
    if (!site.share_slug) return "";
    return `${window.location.origin}/s/${site.share_slug}`;
  }

  async function copyLink(site: Site) {
    const url = publicUrl(site);
    if (!url || !site.is_public) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link público copiado.");
  }

  function startRename(site: Site) {
    setEditing(site.id);
    setEditTitle(site.title);
  }

  function saveRename(site: Site) {
    const title = editTitle.trim();
    if (!title) return;
    updateSite.mutate({ id: site.id, patch: { title } });
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Centralize seus projetos, publique links e acompanhe o estado de cada site."
        actions={
          <Button onClick={() => window.location.assign("/briefings")}>
            <Plus className="mr-2 h-4 w-4" /> Criar novo site
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Total", String(sites.data?.length ?? 0)],
          ["Publicados", String((sites.data ?? []).filter((s) => s.is_public).length)],
          ["Rascunhos", String((sites.data ?? []).filter((s) => !s.is_public).length)],
        ].map(([label, value]) => (
          <Card key={label} className="border-white/[0.07] bg-[#0e0a07]/75 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-white/[0.07] bg-[#0e0a07]/75">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar sites..." className="border-white/[0.07] bg-white/[0.025] pl-9" />
          </div>
          <Button variant="outline" onClick={() => sites.refetch()} disabled={sites.isFetching}>Atualizar</Button>
        </div>

        {sites.isLoading ? (
          <div className="p-10 text-center text-sm text-white/35">Carregando seus sites…</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Globe2 className="mx-auto h-8 w-8 text-white/15" />
            <p className="mt-4 text-sm font-medium text-white/65">{search ? "Nenhum site encontrado." : "Você ainda não criou nenhum site."}</p>
            <p className="mt-1 text-xs text-white/30">Comece por um briefing e deixe a IA criar a primeira versão.</p>
            <Button className="mt-5" onClick={() => window.location.assign("/briefings")}>Criar primeiro site</Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {filtered.map((site) => {
              const url = publicUrl(site);
              return (
                <div key={site.id} className="group flex flex-col gap-4 p-5 transition-colors hover:bg-white/[0.018] lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/[0.06]">
                      <Globe2 className="h-5 w-5 text-orange-400/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editing === site.id ? (
                        <div className="flex gap-2">
                          <Input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveRename(site); if (e.key === "Escape") setEditing(null); }} className="h-9 max-w-md border-orange-500/25 bg-white/[0.03]" />
                          <Button size="sm" onClick={() => saveRename(site)}>Salvar</Button>
                        </div>
                      ) : (
                        <button className="truncate text-left text-sm font-semibold text-white/85 hover:text-orange-300" onClick={() => window.location.assign(`/prompts?site=${site.id}`)}>{site.title}</button>
                      )}
                      <p className="mt-1 text-[11px] text-white/25">Criado em {new Date(site.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={site.is_public ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300" : "border-white/[0.08] bg-white/[0.025] text-white/40"}>
                      {site.is_public ? "Publicado" : "Rascunho"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => window.location.assign(`/prompts?site=${site.id}`)}><Eye className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => startRename(site)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Renomear</Button>
                    <Button variant="ghost" size="icon" disabled={!site.is_public || !url} onClick={() => copyLink(site)} title="Copiar link"><Link2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={!site.is_public || !url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")} title="Abrir site"><ExternalLink className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => updateSite.mutate({ id: site.id, patch: { is_public: !site.is_public } })} title={site.is_public ? "Despublicar" : "Publicar"}><MoreHorizontal className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-400/60 hover:bg-red-500/10 hover:text-red-300" onClick={() => { if (window.confirm(`Excluir "${site.title}"? Essa ação não pode ser desfeita.`)) deleteSite.mutate(site.id); }} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
