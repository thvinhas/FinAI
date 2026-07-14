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
        className={`w-full appearance-none rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-[3px] focus:ring-accent-soft ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
}
