"use client";

import { ChevronDown } from "lucide-react";

export default function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 pr-10 text-sm text-white outline-none transition-all hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  );
}
