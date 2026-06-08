"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const HIDE_ON = ["/login", "/transactions/new"];

export default function FloatingActionButton() {
  const pathname = usePathname();

  if (HIDE_ON.includes(pathname)) return null;

  return (
    <a
      href="/transactions/new"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 transition-all hover:scale-110 hover:bg-indigo-500 active:scale-95 sm:bottom-8 sm:right-8"
    >
      <Plus size={26} />
    </a>
  );
}
