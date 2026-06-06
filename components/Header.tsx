"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { LayoutDashboard, ArrowLeftRight, Wallet, Tags, LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/categories", label: "Categorias", icon: Tags },
];

export default function Header({ userName }: { userName?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/dashboard" className="shrink-0 text-lg font-bold text-indigo-400">
          FinApp
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors sm:px-3 ${
                pathname === link.href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <link.icon size={18} />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              className="ml-1 flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-zinc-400 transition-colors hover:text-red-400 sm:px-3"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
