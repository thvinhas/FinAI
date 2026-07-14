"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { LayoutDashboard, ArrowLeftRight, Wallet, Tags, Upload, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppShell({
  userName,
  children,
}: {
  userName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitial = (userName ?? "?").charAt(0).toUpperCase();

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      <div
        className={cn("app-sidebar-overlay", sidebarOpen && "app-sidebar-open")}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={cn(
          "app-sidebar flex flex-col gap-1.5 border-r border-border bg-surface px-3.5 py-5",
          sidebarOpen && "app-sidebar-open"
        )}
      >
        <Link
          href="/dashboard"
          className="app-sidebar-brand flex items-center gap-2.5 pb-3.5"
        >
          <span className="flex size-[30px] flex-none items-center justify-center rounded-[9px] bg-accent">
            <span className="size-[11px] rounded-full border-[2.5px] border-surface" />
          </span>
          <span className="app-sidebar-label font-heading text-[17px] font-bold tracking-tight">
            FinApp
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "app-nav-item flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={20} className="flex-none" />
                <span className="app-sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar-user mt-auto flex-col gap-2 border-t border-border pt-3.5">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
              {userInitial}
            </span>
            <span className="text-[13px] font-bold">{userName}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[10px] border border-border px-3 py-2.5 text-left text-[13px] font-semibold text-muted-foreground"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-sm">
          <div className="flex items-center gap-4 px-6 py-3.5">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Abrir menu"
              className="flex size-9 flex-none flex-col items-center justify-center gap-[3px] rounded-[9px] border border-border bg-surface2"
            >
              <Menu size={18} />
            </button>

            <div className="flex-1" />

            <span className="app-header-greeting text-sm text-muted-foreground">
              Olá, <span className="font-bold text-foreground">{userName}</span>
            </span>

            <div className="app-header-avatar relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Menu do usuário"
                className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent"
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-11 z-35 min-w-[140px] rounded-xl border border-border bg-surface p-1.5 shadow-card">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold"
                    >
                      Sair
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-main mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6 px-6 py-7 pb-[100px]">
          {children}
        </main>
      </div>
    </div>
  );
}
