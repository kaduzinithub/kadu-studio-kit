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
  Search,
  Bell,
  LogOut,
  Menu,
} from "lucide-react";
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

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/companies", label: "Empresas / Maps", icon: MapPin },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/briefings", label: "Briefings", icon: ClipboardList },
  { to: "/prompts", label: "Gerador de Prompt", icon: Sparkles },
  { to: "/messages", label: "Mensagens", icon: MessageSquare },
  { to: "/clients", label: "Clientes", icon: Briefcase },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/settings", label: "Configurações", icon: SettingsIcon },
] as const;

export function AppShell({ children, user }: { children: ReactNode; user: { email?: string; name?: string } }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user.name || user.email || "K")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-frame flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl transition-all duration-500",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex items-center gap-3 px-4 h-20 border-b border-sidebar-border">
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
            K
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold">KaduDev</span>
              <span className="text-[10px] uppercase text-muted-foreground">Prompt Engine</span>
            </div>
          )}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                   "nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setCollapsed((c) => !c)}
          >
            <Menu className="h-4 w-4" />
            {!collapsed && <span className="ml-2 text-xs text-muted-foreground">Recolher</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
         <div className="md:hidden fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-64 bg-sidebar border-r border-border p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 h-14 border-b border-border mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                K
              </div>
              <span className="text-sm font-semibold">KaduDev Prompt Engine</span>
            </div>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                    active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
         <header className="h-20 border-b border-border flex items-center gap-3 px-4 md:px-8 bg-background/75 backdrop-blur-xl sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input placeholder="Pesquisar…" className="pl-9 bg-muted/50 border-border/70 rounded-full transition-all duration-300 focus-visible:bg-card" />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Notificações">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {initials || "K"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user.name || "Utilizador"}</div>
                <div className="text-xs text-muted-foreground font-normal truncate">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Terminar sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
         <main className="page-enter flex-1 p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-medium italic">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
