import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Lock, Unlock, Trash2, UserPlus, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app-shell";
import {
  listAccesses,
  createAccess,
  resetAccessPassword,
  setAccessBlocked,
  deleteAccess,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Acessos — KaduDev Prompt Engine" },
      { name: "description", content: "Painel do administrador para liberar acessos ao CRM." },
    ],
  }),
  component: AdminPage,
});

type Cred = { email: string; password: string };

function credText(c: Cred) {
  return `Olá! O seu acesso ao KaduDev Prompt Engine está pronto:\n\nSite: ${window.location.origin}/auth\nEmail: ${c.email}\nSenha: ${c.password}\n\nRecomendamos guardar estes dados em local seguro.`;
}

function AdminPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAccesses);
  const create = useServerFn(createAccess);
  const reset = useServerFn(resetAccessPassword);
  const block = useServerFn(setAccessBlocked);
  const del = useServerFn(deleteAccess);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cred, setCred] = useState<Cred | null>(null);

  const users = useQuery({ queryKey: ["admin-accesses"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-accesses"] });
  const onErr = (e: Error) => toast.error(e.message);

  const mCreate = useMutation({
    mutationFn: () => create({ data: { name, email } }),
    onSuccess: (c) => {
      setCred(c);
      setName("");
      setEmail("");
      toast.success("Acesso liberado");
      refresh();
    },
    onError: onErr,
  });
  const mReset = useMutation({
    mutationFn: (id: string) => reset({ data: { id } }),
    onSuccess: (c) => {
      setCred(c);
      toast.success("Nova senha gerada");
    },
    onError: onErr,
  });
  const mBlock = useMutation({
    mutationFn: (v: { id: string; blocked: boolean }) => block({ data: v }),
    onSuccess: () => refresh(),
    onError: onErr,
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Acesso removido");
      refresh();
    },
    onError: onErr,
  });

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Acessos ao CRM"
        description="Libere acesso para quem comprou. Email e senha são gerados automaticamente."
      />

      {users.error ? (
        <Card className="p-6 text-sm text-destructive">{(users.error as Error).message}</Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-xl italic">Liberar novo acesso</h2>
          <div className="space-y-2">
            <Label>Nome do comprador</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Silva" />
          </div>
          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Deixe vazio para gerar um automaticamente"
            />
          </div>
          <Button
            className="w-full"
            disabled={name.trim().length < 2 || mCreate.isPending}
            onClick={() => mCreate.mutate()}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {mCreate.isPending ? "A gerar…" : "Gerar acesso"}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-display text-xl italic">Dados para enviar</h2>
          {cred ? (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 font-mono text-sm space-y-1">
                <div>Email: {cred.email}</div>
                <div>Senha: {cred.password}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                A senha só aparece agora. Copie antes de sair da página.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => copy(credText(cred))}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar mensagem
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(credText(cred))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Enviar no WhatsApp
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Gere um acesso ou uma nova senha para ver aqui os dados prontos a enviar.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {users.isLoading && <div className="p-6 text-sm text-muted-foreground">A carregar…</div>}
          {users.data?.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium flex items-center gap-2">
                  {u.name || u.email.split("@")[0]}
                  {u.is_admin && <Badge>Admin</Badge>}
                  {u.banned && <Badge variant="destructive">Bloqueado</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.email} · criado {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  {u.last_sign_in_at
                    ? ` · último acesso ${new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")}`
                    : " · nunca entrou"}
                </div>
              </div>
              {!u.is_admin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => mReset.mutate(u.id)} title="Nova senha">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mBlock.mutate({ id: u.id, blocked: !u.banned })}
                    title={u.banned ? "Desbloquear" : "Bloquear"}
                  >
                    {u.banned ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Apagar o acesso de ${u.email}? Os dados dele serão removidos.`))
                        mDel.mutate(u.id);
                    }}
                    title="Apagar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
