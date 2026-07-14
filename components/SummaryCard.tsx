import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const currency = (v: number) => `€ ${v.toFixed(2)}`;

function ComparisonRow({
  current,
  previous,
  favorable,
}: {
  current: number;
  previous: number;
  favorable: "up" | "down";
}) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct >= 0;
  const isFavorable = isUp === (favorable === "up");
  return (
    <div
      className={cn(
        "mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold",
        isFavorable ? "text-positive" : "text-negative"
      )}
    >
      {isUp ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      {Math.abs(pct).toFixed(1)}% vs mês anterior
    </div>
  );
}

export default function SummaryCard({
  label,
  value,
  colorClass,
  current,
  previous,
  favorable,
  compact,
}: {
  label: string;
  value: number;
  colorClass: string;
  current?: number;
  previous?: number;
  favorable?: "up" | "down";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface",
        compact ? "p-[18px_20px]" : "p-5 sm:p-[22px]"
      )}
    >
      <div
        className={cn(
          "font-semibold text-muted-foreground",
          compact ? "mb-2 text-[12.5px]" : "mb-2.5 text-[13px]"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-heading font-bold tabular-nums",
          compact ? "text-[21px]" : "text-2xl sm:text-[26px]",
          colorClass
        )}
      >
        {currency(value)}
      </div>
      {previous !== undefined && current !== undefined && favorable && (
        <ComparisonRow current={current} previous={previous} favorable={favorable} />
      )}
    </div>
  );
}
