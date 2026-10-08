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
import {
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Building2,
  Phone,
  Instagram,
  Navigation,
  ArrowUpRight,
  Database,
  Loader2,
  Globe2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NICHES, STATES, ufOf } from "@/lib/br-locations";
import { useIbgeCities } from "@/lib/use-ibge-cities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [{ title: "Empresas / Maps — KaduDev Studios" }],
  }),
  component: CompaniesPage,
});

function mapsUrl(niche: string, city: string, state: string) {
  const q = encodeURIComponent(
    `${niche} em ${city} ${state}`.trim().replace(/\s+/g, " "),
  );

  return `https://www.google.com/maps/search/${q.replace(/%20/g, "+")}`;
}

function embedUrl(niche: string, city: string, state: string) {
  const q = encodeURIComponent(`${niche} em ${city} ${state}`.trim());

  return `https://www.google.com/maps?q=${q}&output=embed`;
}

function CompaniesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const [niche, setNiche] = useState<string>("Restaurantes");
  const [state, setState] = useState("Ceará");
  const [city, setCity] = useState<string>("Fortaleza");

  const cities = useIbgeCities(ufOf(state));

  const [searched, setSearched] = useState<{
    n: string;
    c: string;
    s: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    address: "",
  });

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

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

      setForm({
        name: "",
        phone: "",
        whatsapp: "",
        instagram: "",
        address: "",
      });

            setSelectedFromMaps(false);

      qc.invalidateQueries({
        queryKey: ["companies"],
      });
    },

    onError: (e) => toast.error((e as Error).message),
  });

  const addToPipeline = useMutation({
    mutationFn: async (c: {
      id: string;
      name: string;
      whatsapp?: string | null;
      phone?: string | null;
      niche?: string | null;
      city?: string | null;
    }) => {
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

    onSuccess: () => {
      toast.success("Adicionado ao pipeline");
    },

    onError: (e) => toast.error((e as Error).message),
  });

  const [selectedFromMaps, setSelectedFromMaps] = useState(false);

  function chooseCompanyFromMaps() {
    setSelectedFromMaps(true);
    document.getElementById("company-capture")?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast.success("Empresa selecionada. Confira os dados e salve no CRM.");
  }

  function search() {
    if (!niche || !city) {
      toast.error("Informe nicho e cidade");
      return;
    }

    window.open(
      mapsUrl(niche, city, state),
      "_blank",
      "noopener,noreferrer",
    );

    setSearched({
      n: niche,
      c: city,
      s: state,
    });
  }

  return (
    <div className="relative space-y-7">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-orange-500/[0.035] blur-[110px]" />

      {/* Header */}
      <PageHeader
        title="Empresas / Maps"
        description="Encontre empresas, organize oportunidades e transforme pesquisas em leads."
      />

      {/* Top metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Building2}
          label="Empresas capturadas"
          value={companies.data?.length ?? 0}
          description="Base atual"
        />

        <MetricCard
          icon={MapPin}
          label="Pesquisa ativa"
          value={searched ? "Ativa" : "Pronta"}
          description={
            searched
              ? `${searched.n} · ${searched.c}`
              : "Escolha um nicho e cidade"
          }
        />

        <MetricCard
          icon={Database}
          label="Fonte"
          value="Google Maps"
          description="Pesquisa sem API paga"
        />
      </div>

      {/* Search + Manual add */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Maps search */}
        <Card className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 p-6 backdrop-blur-xl lg:col-span-2">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-orange-500/[0.035] blur-[80px]" />

          <div className="relative">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                    <MapPin className="h-4 w-4 text-orange-400" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white/90">
                      Pesquisa no Google Maps
                    </h3>

                    <p className="mt-0.5 text-[11px] text-white/30">
                      Encontre empresas por localização e nicho
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/25 sm:flex">
                <Globe2 className="h-3 w-3" />
                Maps
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Niche */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                  Categoria / Nicho
                </Label>

                <Select
                  value={niche}
                  onValueChange={setNiche}
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/[0.08] bg-white/[0.025] text-sm text-white/75 transition-all hover:border-orange-500/20 focus:ring-orange-500/10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72 border-white/[0.08] bg-[#100b08]">
                    {NICHES.map((n) => (
                      <SelectItem
                        key={n}
                        value={n}
                        className="focus:bg-orange-500/10 focus:text-orange-300"
                      >
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                  Estado
                </Label>

                <Select
                  value={state}
                  onValueChange={(v) => {
                    setState(v);
                    setCity("");
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/[0.08] bg-white/[0.025] text-sm text-white/75 transition-all hover:border-orange-500/20 focus:ring-orange-500/10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72 border-white/[0.08] bg-[#100b08]">
                    {STATES.map((s) => (
                      <SelectItem
                        key={s.uf}
                        value={s.name}
                        className="focus:bg-orange-500/10 focus:text-orange-300"
                      >
                        {s.name} ({s.uf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                  Cidade
                </Label>

                <Select
                  value={city}
                  onValueChange={setCity}
                  disabled={cities.isLoading}
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/[0.08] bg-white/[0.025] text-sm text-white/75 transition-all hover:border-orange-500/20 focus:ring-orange-500/10">
                    <SelectValue
                      placeholder={
                        cities.isLoading
                          ? "Carregando cidades..."
                          : "Selecione"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent className="max-h-72 border-white/[0.08] bg-[#100b08]">
                    {(cities.data ?? []).map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="focus:bg-orange-500/10 focus:text-orange-300"
                      >
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={search}
                className="h-11 rounded-xl bg-orange-500 px-5 font-semibold text-black shadow-[0_0_25px_rgba(255,100,0,0.14)] transition-all hover:bg-orange-400 hover:shadow-[0_0_35px_rgba(255,100,0,0.24)]"
              >
                <Search className="mr-2 h-4 w-4" />
                Pesquisar no Maps
              </Button>

              {searched && (
                <Button
                  variant="outline"
                  asChild
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.025] text-white/60 hover:border-orange-500/20 hover:bg-orange-500/[0.05] hover:text-orange-300"
                >
                  <a
                    href={mapsUrl(
                      searched.n,
                      searched.c,
                      searched.s,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Maps
                  </a>
                </Button>
              )}
            </div>

            {/* Search preview */}
            {searched && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-500/10 bg-black/20 shadow-[0_0_45px_rgba(255,100,0,0.04)]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,120,30,0.8)]" />

                    <span className="text-[11px] font-medium text-white/55">
                      {searched.n} · {searched.c}, {searched.s}
                    </span>
                  </div>

                  <span className="text-[9px] uppercase tracking-wider text-white/20">
                    Preview
                  </span>
                </div>

                <div className="aspect-video overflow-hidden">
                  <iframe
                    title="Google Maps"
                    src={embedUrl(
                      searched.n,
                      searched.c,
                      searched.s,
                    )}
                    className="h-full w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Manual company */}
        <Card id="company-capture" className={cn(
          "relative overflow-hidden rounded-2xl border bg-[#0e0a07]/75 p-6 backdrop-blur-xl transition-all duration-500",
          selectedFromMaps ? "border-orange-500/30 shadow-[0_0_45px_rgba(255,100,0,0.09)]" : "border-white/[0.07]"
        )}>
          <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-orange-500/[0.035] blur-[70px]" />

          <div className="relative">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                  <Plus className="h-4 w-4 text-orange-400" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/90">
                    Adicionar empresa
                  </h3>

                  <p className="mt-0.5 text-[11px] text-white/30">
                    {selectedFromMaps ? "Empresa selecionada no Maps — confirme os dados abaixo." : "Cadastre manualmente uma oportunidade"}
                  </p>
                  {selectedFromMaps && (
                    <span className="mt-3 inline-flex w-fit rounded-lg border border-orange-500/15 bg-orange-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-orange-300">
                      Selecionada no Maps
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "name",
                  label: "Nome",
                  icon: Building2,
                  placeholder: "Nome da empresa",
                },
                {
                  key: "phone",
                  label: "Telefone",
                  icon: Phone,
                  placeholder: "(00) 00000-0000",
                },
                {
                  key: "whatsapp",
                  label: "WhatsApp",
                  icon: Phone,
                  placeholder: "(00) 00000-0000",
                },
                {
                  key: "instagram",
                  label: "Instagram",
                  icon: Instagram,
                  placeholder: "@empresa",
                },
                {
                  key: "address",
                  label: "Endereço",
                  icon: Navigation,
                  placeholder: "Endereço",
                },
              ].map((f) => {
                const Icon = f.icon;

                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/30">
                      {f.label}
                    </Label>

                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />

                      <Input
                        placeholder={f.placeholder}
                        value={(form as never)[f.key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [f.key]: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl border-white/[0.07] bg-white/[0.02] pl-9 text-xs text-white placeholder:text-white/20 focus:border-orange-500/25 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>
                );
              })}

              <Button
                className="mt-2 h-11 w-full rounded-xl bg-orange-500 font-semibold text-black shadow-[0_0_25px_rgba(255,100,0,0.12)] transition-all hover:bg-orange-400 hover:shadow-[0_0_35px_rgba(255,100,0,0.22)]"
                onClick={() =>
                  form.name
                    ? addCompany.mutate(form)
                    : toast.error("Informe o nome")
                }
                disabled={addCompany.isPending}
              >
                {addCompany.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {selectedFromMaps ? "Salvar empresa no CRM" : "Adicionar empresa"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Companies database */}
      <Card className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/75 backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-orange-500/[0.025] blur-[80px]" />

        <div className="relative flex flex-col gap-4 border-b border-white/[0.06] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white/90">
                Empresas capturadas
              </h3>

              <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[9px] font-medium text-white/25">
                {companies.data?.length ?? 0}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-white/30">
              Empresas salvas na sua base de prospecção.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <Database className="h-3.5 w-3.5 text-white/25" />

            <span className="text-[10px] text-white/30">
              Base KaduDev
            </span>
          </div>
        </div>

        {companies.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
          </div>
        ) : companies.data && companies.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.045] text-left">
                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Empresa
                  </th>

                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Nicho
                  </th>

                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Localização
                  </th>

                  <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    WhatsApp
                  </th>

                  <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-[0.13em] text-white/25">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {companies.data.map((c) => (
                  <tr
                    key={c.id}
                    className="group border-b border-white/[0.035] transition-colors last:border-0 hover:bg-white/[0.018]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] transition-colors group-hover:border-orange-500/20 group-hover:bg-orange-500/[0.07]">
                          <Building2 className="h-4 w-4 text-white/25 transition-colors group-hover:text-orange-400" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-white/75">
                            {c.name}
                          </div>

                          {c.address && (
                            <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-white/25">
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/40">
                        {c.niche || "—"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-white/45">
                        <MapPin className="h-3 w-3 text-orange-400/50" />
                        {c.city || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {c.whatsapp ? (
                        <span className="text-xs text-white/50">
                          {c.whatsapp}
                        </span>
                      ) : (
                        <span className="text-xs text-white/15">
                          Não informado
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => addToPipeline.mutate(c)}
                        disabled={addToPipeline.isPending}
                        className={cn(
                          "h-8 rounded-lg border border-orange-500/15 bg-orange-500/[0.07] px-3 text-[10px] font-semibold text-orange-300 transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.13]",
                        )}
                      >
                        {addToPipeline.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            + Pipeline
                            <ArrowUpRight className="ml-1.5 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025]">
              <Building2 className="h-6 w-6 text-white/15" />
            </div>

            <p className="mt-4 text-sm font-semibold text-white/55">
              Nenhuma empresa cadastrada
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-white/25">
              Pesquise empresas no Google Maps ou adicione uma oportunidade
              manualmente para começar sua base.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof MapPin;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0a07]/70 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/15">
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-orange-500/[0.05] blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] transition-colors group-hover:border-orange-500/20 group-hover:bg-orange-500/10">
          <Icon className="h-4 w-4 text-white/30 transition-colors group-hover:text-orange-400" />
        </div>

        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
            {label}
          </div>

          <div className="mt-0.5 truncate text-sm font-semibold text-white/75">
            {value}
          </div>

          <div className="mt-0.5 truncate text-[9px] text-white/20">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
