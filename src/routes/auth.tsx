import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — KaduDev Prompt Engine" },
      { name: "description", content: "Acesso à plataforma privada da KaduDev Studios." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("E-mail de recuperação enviado.");
        setMode("login");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback: bootstrap admin on first use
        if (error.message.toLowerCase().includes("invalid")) {
          const { error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
          if (signupError) throw error;
          toast.success("Conta criada. A entrar…");
          const { error: retry } = await supabase.auth.signInWithPassword({ email, password });
          if (retry) throw retry;
        } else {
          throw error;
        }
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 border-border bg-card">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">KaduDev Prompt Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Entrar na sua conta" : "Recuperar palavra-passe"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@kadudev.local"
            />
          </div>
          {mode === "login" && (
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "A processar…" : mode === "login" ? "Entrar" : "Enviar link de recuperação"}
          </Button>
        </form>
        <div className="flex justify-between text-xs text-muted-foreground mt-6">
          <button
            className="hover:text-foreground"
            type="button"
            onClick={() => setMode(mode === "login" ? "reset" : "login")}
          >
            {mode === "login" ? "Esqueci a palavra-passe" : "Voltar para o login"}
          </button>
          <span>Uso interno KaduDev Studios</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-6 text-center">
          Credenciais iniciais: <b>admin@kadudev.local</b> / <b>Alterar123!</b>
          <br />
          (Serão criadas automaticamente no primeiro acesso.)
        </p>
      </Card>
    </div>
  );
}
