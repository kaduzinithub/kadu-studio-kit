import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("E-mail de recuperação enviado.");
        setMode("login");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          const { error: signupError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
          if (signupError) throw error;
          toast.success("Conta criada. A entrar…");
          const { error: retry } = await supabase.auth.signInWithPassword({ email, password });
          if (retry) throw retry;
        } else throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080604] px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,105,0,0.14),transparent_38%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-orange-600/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-500/[0.06] blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center justify-center py-10">
        <Card className="w-full overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#100b08]/90 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.58),0_0_70px_rgba(255,100,0,0.08)] backdrop-blur-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border border-orange-300/25 bg-[#120a05] shadow-[0_0_45px_rgba(255,100,0,0.22)]">
              <img src="/src/assets/logo-k-3d.png" alt="KaduDev Studios" className="h-full w-full object-contain p-1 drop-shadow-[0_7px_14px_rgba(255,100,0,0.3)]" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">KaduDev Prompt Engine</h1>
            <p className="mt-1 text-sm text-white/35">{mode === "login" ? "Entrar na sua conta" : "Recuperar palavra-passe"}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email" className="text-white/65">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Seu e-mail" className="border-white/[0.08] bg-white/[0.025] text-white placeholder:text-white/20 focus:border-orange-500/35 focus:ring-orange-500/10" /></div>
            {mode === "login" && <div className="space-y-2"><Label htmlFor="password" className="text-white/65">Palavra-passe</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="border-white/[0.08] bg-white/[0.025] text-white placeholder:text-white/20 focus:border-orange-500/35 focus:ring-orange-500/10" /></div>}
            <Button type="submit" className="h-11 w-full rounded-xl bg-orange-500 font-semibold text-black shadow-[0_0_28px_rgba(255,100,0,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_38px_rgba(255,100,0,0.32)]" disabled={loading}>{loading ? "A processar…" : mode === "login" ? "Entrar" : "Enviar link de recuperação"}</Button>
          </form>

          <div className="mt-6 flex justify-between text-xs text-white/30">
            <button className="transition-colors hover:text-orange-300" type="button" onClick={() => setMode(mode === "login" ? "reset" : "login")}>{mode === "login" ? "Esqueci a palavra-passe" : "Voltar para o login"}</button>
            <span>Uso interno KaduDev Studios</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
