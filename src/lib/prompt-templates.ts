// Motor de geração de prompts profissionais para criação de sites.
export type BriefingLike = {
  company_name?: string | null;
  niche?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  address?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  style?: string | null;
  audience?: string | null;
  goal?: string | null;
  pages?: string | null;
  services?: string | null;
  differentials?: string | null;
  promotions?: string | null;
  hours?: string | null;
  cta?: string | null;
  notes?: string | null;
};

export const NICHOS = [
  "Barbearia",
  "Restaurante",
  "Clínica",
  "Academia",
  "Loja",
  "Hotel",
  "Pizzaria",
  "Oficina",
  "Advogado",
  "Dentista",
] as const;

const nichoHints: Record<string, string> = {
  Barbearia: "Foto de cortes reais, agendamento online, catálogo de serviços com preços, galeria estilo Instagram, seção de barbeiros.",
  Restaurante: "Cardápio digital categorizado, fotos apetitosas, reservas, mapa da localização, avaliações reais.",
  Clínica: "Áreas de atuação, corpo clínico, agendamento, informações de convénios, blog de saúde.",
  Academia: "Modalidades, planos, professores, tour virtual, agenda de aulas coletivas.",
  Loja: "Catálogo de produtos com filtros, promoções, WhatsApp por produto, entrega e formas de pagamento.",
  Hotel: "Galeria de quartos, disponibilidade, atrações locais, política de reservas, avaliações.",
  Pizzaria: "Cardápio com fotos, monte sua pizza, promoções, pedido via WhatsApp, área de entrega.",
  Oficina: "Serviços, marcas atendidas, orçamento rápido, fotos de trabalhos, agendamento.",
  Advogado: "Áreas de atuação, biografia, conteúdo educativo, agendamento de consulta, casos de sucesso.",
  Dentista: "Especialidades, tour do consultório, agendamento, convênios, antes/depois.",
};

function line(label: string, value?: string | null) {
  if (!value || !value.trim()) return "";
  return `- **${label}:** ${value.trim()}`;
}

export function generatePrompt(b: BriefingLike): string {
  const nicho = b.niche || "Serviço local";
  const cidade = [b.city, b.state].filter(Boolean).join(", ");
  const hint = nichoHints[nicho] || "";

  const parts: string[] = [];

  parts.push(`# Briefing: Website profissional para ${b.company_name || "empresa"}`);
  parts.push("");
  parts.push(`Você é uma agência sênior de design e desenvolvimento. Crie um website institucional **premium, responsivo, rápido e otimizado para SEO local** para o cliente descrito abaixo.`);
  parts.push("");
  parts.push("## 1. Contexto do negócio");
  parts.push([
    line("Empresa", b.company_name),
    line("Nicho", nicho),
    line("Localização", cidade),
    line("Endereço", b.address),
    line("Telefone", b.phone),
    line("WhatsApp", b.whatsapp),
    line("Instagram", b.instagram),
    line("E-mail", b.email),
    line("Horário", b.hours),
    line("Público-alvo", b.audience),
    line("Objetivo do site", b.goal),
    line("Diferenciais", b.differentials),
    line("Promoções em destaque", b.promotions),
  ].filter(Boolean).join("\n"));

  parts.push("");
  parts.push("## 2. Identidade visual");
  parts.push([
    line("Cor principal", b.primary_color),
    line("Cor secundária", b.secondary_color),
    line("Estilo visual desejado", b.style || "Minimalista premium, tipografia moderna, muito espaço em branco, cantos 20px, sombras suaves."),
    "- **Tipografia:** Inter ou similar, títulos com peso 600–700.",
    "- **Tokens:** definir cores, tipografia, sombras e raios num sistema de design centralizado.",
  ].join("\n"));

  parts.push("");
  parts.push("## 3. Estrutura de páginas");
  const pages = (b.pages && b.pages.trim()) || "Home, Sobre, Serviços, Galeria, Depoimentos, Contacto";
  parts.push(`- ${pages.split(/[,\n]/).map((p) => p.trim()).filter(Boolean).join("\n- ")}`);

  parts.push("");
  parts.push("## 4. Seções obrigatórias na Home");
  parts.push([
    "- Hero com título forte, subtítulo, CTA principal e imagem hero de alta qualidade.",
    "- Bloco de serviços/produtos com cards e ícones.",
    "- Diferenciais numerados.",
    "- Prova social: depoimentos e avaliações.",
    "- Bloco de promoções ativas (se existirem).",
    "- Bloco de contacto com WhatsApp, telefone, e-mail e mapa incorporado.",
    "- Footer com redes sociais, horário e políticas.",
  ].join("\n"));

  if (b.services) {
    parts.push("");
    parts.push("## 5. Serviços principais");
    parts.push(b.services);
  }

  parts.push("");
  parts.push("## 6. Copywriting");
  parts.push([
    `- Tom de voz alinhado ao público **${b.audience || "local"}**.`,
    "- Títulos orientados a benefício, subtítulos claros, textos curtos e escaneáveis.",
    `- CTA principal: **${b.cta || "Falar no WhatsApp agora"}**.`,
    "- Todos os botões devem levar a ações reais (WhatsApp, telefone, formulário).",
  ].join("\n"));

  parts.push("");
  parts.push("## 7. SEO local");
  parts.push([
    `- Title, meta description e Open Graph otimizados para "${nicho} em ${cidade || "cidade"}".`,
    "- Schema.org LocalBusiness com nome, endereço, telefone, horário e coordenadas.",
    "- URLs limpas, sitemap.xml, robots.txt, canonical, alt em todas as imagens.",
    "- Google Maps incorporado por iframe apontando para o endereço real.",
  ].join("\n"));

  parts.push("");
  parts.push("## 8. Integrações");
  parts.push([
    b.whatsapp ? `- Botão flutuante de WhatsApp com link \`https://wa.me/${(b.whatsapp || "").replace(/\D/g, "")}?text=Olá, vim pelo site\`.` : "- Botão flutuante de WhatsApp.",
    "- Formulário de contacto com validação (nome, telefone, mensagem).",
    b.instagram ? `- Ligação para Instagram ${b.instagram}.` : "- Ligações para redes sociais.",
    "- Mapa embed do Google Maps.",
  ].join("\n"));

  parts.push("");
  parts.push("## 9. Requisitos técnicos");
  parts.push([
    "- 100% responsivo (mobile-first, breakpoints em 640/768/1024/1280).",
    "- Acessibilidade AA: contraste, foco visível, ARIA em componentes interativos.",
    "- Performance: imagens otimizadas (webp/avif), lazy loading, Core Web Vitals em verde.",
    "- Animações suaves com Framer Motion, sem exageros.",
    "- Componentes reutilizáveis, tipagem forte, código limpo.",
  ].join("\n"));

  if (hint) {
    parts.push("");
    parts.push(`## 10. Especificidades do nicho (${nicho})`);
    parts.push(`- ${hint}`);
  }

  if (b.notes) {
    parts.push("");
    parts.push("## 11. Observações adicionais");
    parts.push(b.notes);
  }

  parts.push("");
  parts.push("## Entregável");
  parts.push("Gere o projeto completo, com todas as páginas indicadas, componentes reutilizáveis, sistema de design centralizado, dados de exemplo realistas do próprio cliente, e um README explicando como personalizar cores, textos e imagens.");

  return parts.join("\n");
}
