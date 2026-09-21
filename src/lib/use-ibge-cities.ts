import { useQuery } from "@tanstack/react-query";

type IbgeCity = { nome: string };

async function fetchCities(uf: string): Promise<string[]> {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
  );
  if (!res.ok) throw new Error("Falha ao carregar cidades");
  const data = (await res.json()) as IbgeCity[];
  return data.map((c) => c.nome);
}

/** Loads all cities of a Brazilian state (UF) from the free IBGE API. */
export function useIbgeCities(uf: string | undefined) {
  return useQuery({
    queryKey: ["ibge-cities", uf],
    queryFn: () => fetchCities(uf!),
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
