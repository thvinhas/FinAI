"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-3.5 rounded-2xl border border-border bg-surface p-5.5">
      <div>
        <div className="text-[15px] font-bold">Aparência</div>
        <div className="mt-0.5 text-[12.5px] text-muted-foreground">
          Alternar entre tema claro e escuro
        </div>
      </div>
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Alternar tema"
        className="relative h-6 w-11 flex-none rounded-full border border-border bg-surface2"
      >
        <span
          suppressHydrationWarning
          className={cn(
            "absolute top-0.5 size-[18px] rounded-full bg-accent transition-all duration-200",
            isDark ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
