import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import { ExternalLink, MapPin, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NICHES, STATES, citiesOf, OTHER } from "@/lib/br-locations";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({ meta: [{ title: "Empresas / Maps — KaduDev Prompt Engine" }] }),
  component: CompaniesPage,
});

function mapsUrl(niche: string, city: string, state: string) {
  const q = encodeURIComponent(`${niche} em ${city} ${state}`.trim().replace(/\s+/g, " "));
  return `https://www.google.com/maps/search/${q.replace(/%20/g, "+")}`;
}
function embedUrl(niche: string, city: string, state: string) {
  const q = encodeURIComponent(`${niche} em ${city} ${state}`.trim());
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

function CompaniesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [nicheSel, setNicheSel] = useState<string>("Restaurantes");
  const [nicheCustom, setNicheCustom] = useState("");
  const [state, setState] = useState("Pará");
  const [citySel, setCitySel] = useState<string>("Belém");
  const [cityCustom, setCityCustom] = useState("");
  const niche = nicheSel === OTHER ? nicheCustom : nicheSel;
  const city = citySel === OTHER ? cityCustom : citySel;
  const [searched, setSearched] = useState<{ n: string; c: string; s: string } | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", instagram: "", address: "" });

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCompany = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { error } = await supabase.from("companies").insert({
        user_id: user.id,
        ...payload,
        niche,
        city,
        state,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa adicionada");
      setForm({ name: "", phone: "", whatsapp: "", instagram: "", address: "" });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addToPipeline = useMutation({
    mutationFn: async (c: { id: string; name: string; whatsapp?: string | null; phone?: string | null; niche?: string | null; city?: string | null }) => {
      const { error } = await supabase.from("leads").insert({
        user_id: user.id,
        company_id: c.id,
        name: c.name,
        contact: c.phone ?? undefined,
        whatsapp: c.whatsapp ?? undefined,
        niche: c.niche ?? undefined,
        city: c.city ?? undefined,
        status: "novo",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Adicionado ao pipeline"),
    onError: (e) => toast.error((e as Error).message),
  });

  function search() {
    if (!niche || !city) return toast.error("Informe nicho e cidade");
    window.open(mapsUrl(niche, city, state), "_blank", "noopener");
    setSearched({ n: niche, c: city, s: state });
  }

  return (
    <div>
      <PageHeader
        title="Empresas / Maps"
        description="Pesquise no Google Maps sem APIs pagas e adicione manualmente ao pipeline."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Pesquisar no Google Maps
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Categoria / Nicho</Label>
              <Select value={nicheSel} onValueChange={setNicheSel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  <SelectItem value={OTHER}>Outra categoria…</SelectItem>
                </SelectContent>
              </Select>
              {nicheSel === OTHER && (
                <Input value={nicheCustom} onChange={(e) => setNicheCustom(e.target.value)} placeholder="Digite a categoria" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={state}
                onValueChange={(v) => {
                  setState(v);
                  setCitySel(citiesOf(v)[0] ?? OTHER);
                  setCityCustom("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {STATES.map((s) => <SelectItem key={s.uf} value={s.name}>{s.name} ({s.uf})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select value={citySel} onValueChange={setCitySel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {citiesOf(state).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value={OTHER}>Outra cidade…</SelectItem>
                </SelectContent>
              </Select>
              {citySel === OTHER && (
                <Input value={cityCustom} onChange={(e) => setCityCustom(e.target.value)} placeholder="Digite a cidade" />
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={search}>
              <MapPin className="h-4 w-4 mr-2" /> Pesquisar no Maps
            </Button>
            {searched && (
              <Button variant="outline" asChild>
                <a href={mapsUrl(searched.n, searched.c, searched.s)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir no Google Maps
                </a>
              </Button>
            )}
          </div>
          {searched && (
            <div className="aspect-video rounded-2xl overflow-hidden border border-border">
              <iframe
                title="Google Maps"
                src={embedUrl(searched.n, searched.c, searched.s)}
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Adicionar empresa manualmente
          </h3>
          <div className="space-y-3">
            {[
              { key: "name", label: "Nome" },
              { key: "phone", label: "Telefone" },
              { key: "whatsapp", label: "WhatsApp" },
              { key: "instagram", label: "Instagram" },
              { key: "address", label: "Endereço" },
            ].map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={(form as never)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <Button
              className="w-full"
              onClick={() => form.name ? addCompany.mutate(form) : toast.error("Informe o nome")}
              disabled={addCompany.isPending}
            >
              Adicionar empresa
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-medium mb-4">Empresas capturadas</h3>
        {companies.data && companies.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase text-left">
                <tr>
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Nicho</th>
                  <th className="pb-2">Cidade</th>
                  <th className="pb-2">WhatsApp</th>
                  <th className="pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.data.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3">{c.niche}</td>
                    <td className="py-3">{c.city}</td>
                    <td className="py-3">{c.whatsapp}</td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => addToPipeline.mutate(c)}>
                        + Pipeline
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma empresa ainda.</p>
        )}
      </Card>
    </div>
  );
}
