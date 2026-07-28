import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";
import { MESSAGE_TYPES, renderMessage, whatsappUrl, type MessageType } from "@/lib/message-templates";
import { Copy, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Mensagens — KaduDev Prompt Engine" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [type, setType] = useState<MessageType>("whatsapp_inicial");
  const [leadId, setLeadId] = useState<string>("manual");
  const [empresa, setEmpresa] = useState("");
  const [cidade, setCidade] = useState("");
  const [nicho, setNicho] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [assinatura, setAssinatura] = useState("KaduDev Studios");
  const [content, setContent] = useState("");

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id,name,city,niche,whatsapp").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const settings = useQuery({
    queryKey: ["settings", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings.data?.signature) setAssinatura(settings.data.signature);
  }, [settings.data]);

  useEffect(() => {
    if (leadId === "manual") return;
    const l = leads.data?.find((x) => x.id === leadId);
    if (l) {
      setEmpresa(l.name ?? "");
      setCidade(l.city ?? "");
      setNicho(l.niche ?? "");
      setWhatsapp(l.whatsapp ?? "");
    }
  }, [leadId, leads.data]);

  const preview = useMemo(
    () => renderMessage(type, { empresa, cidade, nicho, whatsapp, assinatura }),
    [type, empresa, cidade, nicho, whatsapp, assinatura],
  );

  useEffect(() => setContent(preview), [preview]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        user_id: user.id,
        lead_id: leadId === "manual" ? null : leadId,
        type,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem guardada");
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  function openWhatsApp() {
    if (!whatsapp) return toast.error("Informe o número de WhatsApp");
    save.mutate();
    window.open(whatsappUrl(whatsapp, content), "_blank", "noopener");
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    toast.success("Copiado");
  }

  return (
    <div>
      <PageHeader
        title="Mensagens"
        description="Gere e envie mensagens comerciais automaticamente pelo WhatsApp."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as MessageType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (sem lead)</SelectItem>
                  {(leads.data ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Empresa</Label><Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Cidade</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nicho</Label><Input value={nicho} onChange={(e) => setNicho(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>WhatsApp (com DDI)</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5591999999999" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Assinatura</Label><Input value={assinatura} onChange={(e) => setAssinatura(e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openWhatsApp} className="gap-2"><Send className="h-4 w-4" /> Enviar no WhatsApp</Button>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
            <Button variant="ghost" onClick={() => save.mutate()}>Guardar</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Preview</h3>
            <span className="text-xs text-muted-foreground">{content.length} caracteres</span>
          </div>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[420px] whitespace-pre-wrap" />
        </Card>
      </div>
    </div>
  );
}
