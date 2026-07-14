"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthPicker({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();

  const goTo = (y: number, m: number) => {
    router.push(`/dashboard?m=${y}-${String(m + 1).padStart(2, "0")}`);
  };

  const prev = () => {
    if (month === 0) goTo(year - 1, 11);
    else goTo(year, month - 1);
  };

  const next = () => {
    const now = new Date();
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth())) return;
    goTo(nextY, nextM);
  };

  const isCurrent =
    year === new Date().getFullYear() && month === new Date().getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="flex items-center gap-3.5">
      <button
        onClick={prev}
        className="flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface2 text-foreground transition-colors hover:bg-surface3"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-30 text-center font-heading text-lg font-bold capitalize">
        {monthNames[month]} de {year}
      </span>
      <button
        onClick={next}
        disabled={isCurrent}
        className="flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface2 text-foreground transition-colors hover:bg-surface3 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
