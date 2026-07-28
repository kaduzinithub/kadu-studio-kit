export type MessageVars = {
  empresa?: string;
  cidade?: string;
  nicho?: string;
  whatsapp?: string;
  assinatura?: string;
};

export const MESSAGE_TYPES = [
  { id: "whatsapp_inicial", label: "WhatsApp — Abordagem inicial" },
  { id: "followup_1", label: "WhatsApp — Follow-up 1" },
  { id: "followup_2", label: "WhatsApp — Follow-up 2" },
  { id: "instagram_dm", label: "Instagram DM" },
  { id: "email", label: "E-mail profissional" },
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number]["id"];

const templates: Record<MessageType, string> = {
  whatsapp_inicial: `Olá! Aqui é da {{assinatura}} 👋

Passei pelo perfil da *{{empresa}}* em {{cidade}} e adorei o trabalho de vocês no ramo de {{nicho}}.

Criamos sites profissionais que ajudam negócios locais a aparecerem melhor no Google e a receberem mais clientes pelo WhatsApp. Posso enviar 2 exemplos rápidos?`,

  followup_1: `Oi novamente! Só passando aqui para saber se conseguiu ver a proposta de site para a *{{empresa}}* 🚀

Se preferir, posso ligar num horário que for melhor para si.`,

  followup_2: `Olá! Última mensagem por aqui 🙂

Se ainda tiver interesse num site profissional para a *{{empresa}}* em {{cidade}}, é só responder este WhatsApp. Continuamos à disposição!

— {{assinatura}}`,

  instagram_dm: `Olá! Vi o perfil da {{empresa}} e curti muito o trabalho de vocês. Criamos sites premium para {{nicho}} em {{cidade}}. Posso enviar um exemplo por aqui?`,

  email: `Assunto: Site profissional para {{empresa}}

Olá, tudo bem?

Sou da {{assinatura}}. Encontrei a {{empresa}} entre os destaques de {{nicho}} em {{cidade}} e gostaria de propor a criação de um site profissional focado em captar mais clientes locais.

Podemos marcar 15 minutos para apresentar duas referências e um orçamento sem compromisso?

Fico ao dispor,
{{assinatura}}`,
};

export function renderMessage(type: MessageType, vars: MessageVars): string {
  const filled = templates[type]
    .replaceAll("{{empresa}}", vars.empresa || "sua empresa")
    .replaceAll("{{cidade}}", vars.cidade || "sua cidade")
    .replaceAll("{{nicho}}", vars.nicho || "seu segmento")
    .replaceAll("{{whatsapp}}", vars.whatsapp || "")
    .replaceAll("{{assinatura}}", vars.assinatura || "KaduDev Studios");
  return filled;
}

export function whatsappUrl(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
