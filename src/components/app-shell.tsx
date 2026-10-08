import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardList,
  Sparkles,
  MessageSquare,
  Briefcase,
  BarChart3,
  Settings as SettingsIcon,
  Cable,
  Search,
  Bell,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  Command,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import logoK3D from "@/assets/logo-k-3d.png";

const NAV_GROUPS = [
  { label: "Principal", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/companies", label: "Empresas / Maps", icon: MapPin },
    { to: "/leads", label: "Leads", icon: Users },
    { to: "/clients", label: "Clientes", icon: Briefcase },
  ]},
  { label: "Produção", items: [
    { to: "/briefings", label: "Briefings", icon: ClipboardList },
    { to: "/prompts", label: "Gerador de Prompt", icon: Sparkles },
    { to: "/messages", label: "Mensagens", icon: MessageSquare },
  ]},
  { label: "Análise", items: [{ to: "/reports", label: "Relatórios", icon: BarChart3 }] },
  { label: "Sistema", items: [
    { to: "/integrations", label: "Integrações", icon: Cable },
    { to: "/settings", label: "Configurações", icon: SettingsIcon },
  ] },
] as const;

const ADMIN_ITEMS = [
  { to: "/admin", label: "Acessos", icon: ShieldCheck },
  { to: "/admin-vendas", label: "Vendas", icon: Wallet },
  { to: "/admin-precos", label: "Preços", icon: Tag },
] as const;

const LOGO_SRC = logoK3D;

export function AppShell({ children, user }: { children: ReactNode; user: { email?: string; name?: string } }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  }).data;

  const access = useQuery({
    queryKey: ["my-access"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("access_plans").select("expires_at").eq("user_id", u.user.id).maybeSingle();
      return data?.expires_at ?? null;
    },
    staleTime: 60 * 1000,
  }).data;

  const expired = isAdmin === false && !!access && new Date(access) < new Date();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user.name || user.email || "K").split(/[\s@]/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  if (expired) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080604] p-6 text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,110,0,0.14),transparent_40%)]" />
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-orange-500/20 bg-[#100b07]/90 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_80px_rgba(255,100,0,0.08)] backdrop-blur-2xl">
          <img src={LOGO_SRC} alt="KaduDev Studios" className="mx-auto mb-6 h-16 w-16 object-contain drop-shadow-[0_0_28px_rgba(255,100,0,0.35)]" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">Acesso vencido</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">O seu acesso terminou em <span className="font-medium text-foreground">{new Date(access!).toLocaleDateString("pt-BR")}</span>. Fale com o administrador para renovar.</p>
          <Button onClick={signOut} className="mt-6 h-11 w-full rounded-xl bg-orange-500 font-semibold text-black shadow-[0_0_30px_rgba(255,100,0,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_40px_rgba(255,100,0,0.3)]">Sair</Button>
        </div>
      </div>
    );
  }

  const renderNav = (items: typeof NAV_GROUPS[number]["items"]) => items.map((item) => {
    const active = pathname === item.to || pathname.startsWith(item.to + "/");
    const Icon = item.icon;
    return (
      <Link key={item.to} to={item.to} title={collapsed ? item.label : undefined} className={cn(
        "nav-item group relative flex items-center rounded-xl transition-all duration-200",
        collapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-2.5",
        active ? "bg-gradient-to-r from-orange-500/[0.16] via-orange-500/[0.08] to-transparent text-orange-300 shadow-[inset_2px_0_0_rgba(255,120,30,0.9),0_8px_30px_rgba(255,90,0,0.06)]" : "text-white/50 hover:bg-white/[0.035] hover:text-white/85",
      )}>
        {active && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(255,120,30,0.8)]" />}
        <Icon className={cn("h-[17px] w-[17px] shrink-0 transition-all duration-200", active ? "text-orange-400" : "text-white/35 group-hover:text-orange-300")} />
        {!collapsed && <span className="truncate text-[13px] font-medium">{item.label}</span>}
      </Link>
    );
  });

  return (
    <div className="app-frame relative flex min-h-screen w-full overflow-hidden bg-[#080604] text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-600/[0.045] blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-500/[0.035] blur-[130px]" />
      </div>

      <aside className={cn("relative z-30 hidden shrink-0 md:flex flex-col border-r border-white/[0.07] bg-[#0a0705]/90 backdrop-blur-2xl transition-all duration-300", collapsed ? "w-[78px]" : "w-[270px]")}>
        <div className={cn("relative flex h-[82px] shrink-0 items-center border-b border-white/[0.07]", collapsed ? "justify-center px-3" : "px-5")}>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          <Link to="/dashboard" className={cn("group flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-orange-300/30 bg-[#120a05] shadow-[0_0_28px_rgba(255,100,0,0.22)] transition-all duration-300 group-hover:scale-105 group-hover:-rotate-2 group-hover:shadow-[0_0_42px_rgba(255,100,0,0.38)]">
              <img src={LOGO_SRC} alt="KaduDev Studios" className="h-full w-full object-contain p-0.5 drop-shadow-[0_4px_8px_rgba(255,100,0,0.28)]" />
            </div>
            {!collapsed && <div className="flex min-w-0 flex-col leading-none"><span className="font-display text-[17px] font-semibold tracking-tight text-white">KaduDev</span><span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-orange-400/80">Studios</span></div>}
          </Link>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => <div key={group.label} className="mb-6">
            {!collapsed && <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">{group.label}</div>}
            <div className="space-y-1">{renderNav(group.items)}</div>
          </div>)}
          {isAdmin && <div className="border-t border-white/[0.06] pt-5">
            {!collapsed && <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400/45">Administração</div>}
            <div className="space-y-1">{ADMIN_ITEMS.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return <Link key={item.to} to={item.to} title={collapsed ? item.label : undefined} className={cn("group relative flex items-center rounded-xl transition-all duration-200", collapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-2.5", active ? "bg-orange-500/[0.11] text-orange-300" : "text-white/40 hover:bg-white/[0.035] hover:text-white/80")}>
                <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-orange-400" : "text-white/30 group-hover:text-orange-300")} />
                {!collapsed && <span className="truncate text-[13px] font-medium">{item.label}</span>}
              </Link>;
            })}</div>
          </div>}
        </nav>

        {!collapsed && <div className="mx-3 mb-3 rounded-xl border border-orange-500/[0.10] bg-gradient-to-r from-orange-500/[0.055] to-transparent px-3 py-2.5">
          <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span><span className="text-[10px] font-semibold text-white/50">KaduDev Studios</span><span className="ml-auto text-[8px] uppercase tracking-wider text-emerald-400/60">Online</span></div>
        </div>}

        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <Button variant="ghost" size="sm" className={cn("h-10 w-full rounded-xl border border-transparent text-white/35 transition-all hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-white/80", collapsed ? "justify-center px-0" : "justify-start")} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="ml-2 text-[11px] font-medium">Recolher menu</span></>}
          </Button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setMobileOpen(false)}>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        <div className="absolute left-0 top-0 flex h-full w-[285px] flex-col border-r border-white/[0.08] bg-[#0a0705] shadow-[20px_0_80px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-[82px] items-center justify-between border-b border-white/[0.07] px-5">
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border border-orange-400/30 bg-[#120a05] shadow-[0_0_28px_rgba(255,100,0,0.22)]"><img src={LOGO_SRC} alt="KaduDev Studios" className="h-full w-full object-contain" /></div>
              <div className="flex flex-col leading-none"><span className="font-display text-[17px] font-semibold text-white">KaduDev</span><span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-orange-400/80">Studios</span></div>
            </Link>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/40 hover:bg-white/[0.05] hover:text-white" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-5">
            {NAV_GROUPS.map((group) => <div key={group.label} className="mb-6"><div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">{group.label}</div><div className="space-y-1">{group.items.map((item) => { const Icon=item.icon; const active=pathname===item.to||pathname.startsWith(item.to+"/"); return <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-all",active?"bg-orange-500/[0.12] text-orange-300 shadow-[inset_2px_0_0_rgba(255,120,30,0.8)]":"text-white/50 hover:bg-white/[0.035] hover:text-white")}><Icon className={cn("h-[17px] w-[17px]",active?"text-orange-400":"text-white/35")} />{item.label}</Link>; })}</div></div>)}
            {isAdmin && <div className="border-t border-white/[0.06] pt-5"><div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400/45">Administração</div><div className="space-y-1">{ADMIN_ITEMS.map((item)=>{const Icon=item.icon;const active=pathname===item.to||pathname.startsWith(item.to+"/");return <Link key={item.to} to={item.to} onClick={()=>setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-all",active?"bg-orange-500/[0.12] text-orange-300":"text-white/45 hover:bg-white/[0.035] hover:text-white")}><Icon className="h-[17px] w-[17px]" />{item.label}</Link>})}</div></div>}
          </nav>
        </div>
      </div>}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#080604]/78 px-4 shadow-[0_10px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl md:px-8">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
          <div className="group relative flex max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <Input placeholder="Pesquisar no KaduDev..." className="h-10 w-full rounded-xl border-white/[0.07] bg-white/[0.025] pl-10 pr-12 text-[13px] text-white placeholder:text-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-all duration-200 group-hover:border-white/[0.11] focus:border-orange-500/30 focus:bg-white/[0.04] focus:ring-1 focus:ring-orange-500/10" />
            <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.035] px-1.5 py-0.5 text-[9px] font-medium text-white/20 sm:flex"><Command className="h-2.5 w-2.5" />K</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Notificações" className="relative h-10 w-10 rounded-xl text-white/45 transition-all hover:bg-white/[0.04] hover:text-white"><Bell className="h-[17px] w-[17px]" /><span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,120,30,0.8)]" /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><button className="ml-1 flex items-center gap-2 rounded-full outline-none transition-all hover:bg-white/[0.035]"><Avatar className="h-9 w-9 border border-orange-500/20"><AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-orange-700/10 text-xs font-bold text-orange-300">{initials || "K"}</AvatarFallback></Avatar><div className="hidden max-w-[130px] text-left lg:block"><div className="truncate text-[12px] font-semibold text-white/80">{user.name || "Utilizador"}</div><div className="truncate text-[10px] text-white/30">{user.email}</div></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-60 rounded-2xl border-white/[0.08] bg-[#100b08]/95 p-1.5 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <DropdownMenuLabel className="px-3 py-3"><div className="font-semibold text-white">{user.name || "Utilizador"}</div><div className="mt-1 truncate text-xs font-normal text-white/35">{user.email}</div></DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-white/60 focus:bg-white/[0.05] focus:text-white"><Link to="/settings"><SettingsIcon className="mr-2 h-4 w-4" />Configurações</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer rounded-xl text-red-400 focus:bg-red-500/10 focus:text-red-300"><LogOut className="mr-2 h-4 w-4" />Terminar sessão</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="page-enter min-w-0 flex-1 p-4 md:p-8 lg:p-10"><div className="mx-auto w-full max-w-[1600px]">{children}</div></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}
