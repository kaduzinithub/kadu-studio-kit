export type MessageVars = {
  empresa?: string;
  cidade?: string;
  nicho?: string;
  whatsapp?: string;
  assinatura?: string;
  servicos?: string;
  paginas?: string;
  objetivo?: string;
  diferenciais?: string;
  link?: string;
};

export const MESSAGE_TYPES = [
  { id: "whatsapp_inicial", label: "WhatsApp — Abordagem inicial", group: "Prospeção" },
  { id: "whatsapp_curta", label: "WhatsApp — Abordagem curta", group: "Prospeção" },
  { id: "instagram_dm", label: "Instagram — Mensagem direta", group: "Prospeção" },
  { id: "email", label: "E-mail — Apresentação", group: "Prospeção" },
  { id: "followup_1", label: "Follow-up 1 — Lembrete gentil", group: "Follow-up" },
  { id: "followup_2", label: "Follow-up 2 — Prova social", group: "Follow-up" },
  { id: "followup_3", label: "Follow-up 3 — Última chamada", group: "Follow-up" },
  { id: "proposta_briefing", label: "Proposta com base no briefing", group: "Briefing" },
  { id: "confirmar_briefing", label: "Confirmar dados do briefing", group: "Briefing" },
  { id: "enviar_preview", label: "Enviar link do site (preview)", group: "Briefing" },
  { id: "pedir_ajustes", label: "Pedir ajustes depois do preview", group: "Briefing" },
  { id: "fechamento", label: "Fechamento — Aprovação e pagamento", group: "Fecho" },
  { id: "entrega", label: "Entrega do site no ar", group: "Fecho" },
  { id: "pos_venda", label: "Pós-venda — Como está a correr", group: "Fecho" },
  { id: "reativacao", label: "Reativação de cliente antigo", group: "Fecho" },
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number]["id"];

const templates: Record<MessageType, string> = {
  whatsapp_inicial: `Olá! Aqui é da {{assinatura}} 👋

Vi o trabalho da *{{empresa}}* aí em {{cidade}} e gostei muito do que vocês fazem em {{nicho}}.

Eu crio sites profissionais para negócios locais — feitos para aparecer no Google e trazer contactos direto pelo WhatsApp.

Posso enviar dois exemplos rápidos para ver se faz sentido para vocês?`,

  whatsapp_curta: `Olá! Falo da {{assinatura}} 👋
Faço sites para {{nicho}} em {{cidade}}. Posso mostrar em 1 minuto como ficaria o site da *{{empresa}}*?`,

  instagram_dm: `Olá! Vi o perfil da {{empresa}} e curti muito o trabalho de vocês 👏

Crio sites premium para {{nicho}} em {{cidade}}, com WhatsApp integrado e página rápida no telemóvel.

Quer que eu envie um exemplo pronto por aqui?`,

  email: `Assunto: Site profissional para {{empresa}}

Olá, tudo bem?

Sou da {{assinatura}}. Encontrei a {{empresa}} entre os destaques de {{nicho}} em {{cidade}} e preparei uma proposta de site focada em captar mais clientes locais.

O que costumo entregar:
• Site rápido e bonito no telemóvel
• Botão de WhatsApp em todas as páginas
• Textos e fotos organizados para vender
• Presença melhor nas pesquisas do Google

Podemos marcar 15 minutos para eu mostrar duas referências e passar o valor, sem compromisso?

Fico ao dispor,
{{assinatura}}`,

  followup_1: `Oi, tudo certo? 🙂

Só a confirmar se conseguiu ver a proposta de site para a *{{empresa}}*.

Se preferir, respondo por áudio ou ligo no horário que for melhor para si.`,

  followup_2: `Olá novamente!

Negócios de {{nicho}} que colocámos no ar costumam sentir a diferença logo nas primeiras semanas: mais contactos no WhatsApp e menos perguntas repetidas.

Quer que eu monte uma prévia do site da *{{empresa}}* para ver antes de decidir? Sem custo nenhum.`,

  followup_3: `Olá! Esta é a minha última mensagem por aqui, para não incomodar 🙂

Se em algum momento quiser um site profissional para a *{{empresa}}* em {{cidade}}, guarde este contacto — é só chamar que eu retomo de onde paramos.

Sucesso e obrigado! — {{assinatura}}`,

  proposta_briefing: `Olá! Aqui está o resumo do que combinámos para o site da *{{empresa}}* ✨

• Segmento: {{nicho}}
• Cidade: {{cidade}}
• Objetivo: {{objetivo}}
• Serviços em destaque: {{servicos}}
• Páginas: {{paginas}}
• Diferenciais: {{diferenciais}}

Com isso eu já consigo montar a primeira versão. Confirma se está tudo certo que eu começo hoje mesmo 👍

— {{assinatura}}`,

  confirmar_briefing: `Olá! Antes de começar o site da *{{empresa}}*, confirma rapidinho estes pontos? 🙏

• Serviços que quer destacar: {{servicos}}
• Páginas previstas: {{paginas}}
• O que o site precisa conseguir: {{objetivo}}

Se faltar alguma coisa, é só responder aqui que eu ajusto.`,

  enviar_preview: `Olá! O site da *{{empresa}}* já está pronto para ver 🎉

Link da prévia: {{link}}

Pode abrir no telemóvel à vontade e testar os botões. Depois diga-me o que quer mudar — cores, textos ou fotos — que eu ajusto.

— {{assinatura}}`,

  pedir_ajustes: `Conseguiu dar uma olhada na prévia do site da *{{empresa}}*?

{{link}}

Me diga, sem cerimónia:
1. O que gostou mais
2. O que quer mudar
3. Alguma informação que falta

Com essa resposta eu deixo a versão final pronta rapidinho 🙂`,

  fechamento: `Que bom que gostou! 🙌

Para colocar o site da *{{empresa}}* no ar, o próximo passo é a aprovação e o pagamento da entrada. Assim que confirmar, eu publico e envio o endereço definitivo.

Qualquer dúvida sobre valores ou formas de pagamento, é só perguntar.

— {{assinatura}}`,

  entrega: `O site da *{{empresa}}* está no ar! 🚀

{{link}}

Guarde este link e partilhe nas redes e no cartão de visita. Fico disponível para pequenos ajustes nos próximos dias.

Obrigado pela confiança! — {{assinatura}}`,

  pos_venda: `Olá! Tudo bem por aí?

Passou um tempinho desde que colocámos o site da *{{empresa}}* no ar e queria saber como está a correr — está a receber contactos pelo WhatsApp?

Se quiser atualizar fotos, preços ou promoções, é só dizer.`,

  reativacao: `Olá! Aqui é da {{assinatura}} 👋

Lembrei-me da *{{empresa}}* e queria saber como está o negócio em {{cidade}}.

Se o site precisar de uma renovação — visual novo, mais páginas ou promoções atualizadas — eu preparo uma prévia para ver sem compromisso.`,
};

/** Remove lines whose only real content was an empty variable. */
function cleanUpLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^•\s*[^:]+:\s*$/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderMessage(type: MessageType, vars: MessageVars): string {
  const filled = templates[type]
    .replaceAll("{{empresa}}", vars.empresa || "sua empresa")
    .replaceAll("{{cidade}}", vars.cidade || "sua cidade")
    .replaceAll("{{nicho}}", vars.nicho || "seu segmento")
    .replaceAll("{{whatsapp}}", vars.whatsapp || "")
    .replaceAll("{{servicos}}", vars.servicos || "")
    .replaceAll("{{paginas}}", vars.paginas || "")
    .replaceAll("{{objetivo}}", vars.objetivo || "")
    .replaceAll("{{diferenciais}}", vars.diferenciais || "")
    .replaceAll("{{link}}", vars.link || "")
    .replaceAll("{{assinatura}}", vars.assinatura || "KaduDev Studios");
  return cleanUpLines(filled);
}

export function whatsappUrl(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
