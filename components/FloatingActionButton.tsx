"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

function shouldHide(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/transactions/new") return true;
  if (pathname.startsWith("/transactions/") && pathname.endsWith("/edit")) return true;
  return false;
}

export default function FloatingActionButton() {
  const pathname = usePathname();

  if (shouldHide(pathname)) return null;

  return (
    <a
      href="/transactions/new"
      className="app-fab fixed right-7 bottom-7 z-50 flex size-14 items-center justify-center rounded-full bg-accent text-background shadow-card transition-transform hover:scale-110 active:scale-95"
    >
      <Plus size={26} />
    </a>
  );
}
