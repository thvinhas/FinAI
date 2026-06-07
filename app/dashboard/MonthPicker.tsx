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
    <div className="mb-6 flex items-center gap-3">
      <button
        onClick={prev}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium capitalize text-zinc-200 sm:text-base">
        {monthNames[month]} de {year}
      </span>
      <button
        onClick={next}
        disabled={isCurrent}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
