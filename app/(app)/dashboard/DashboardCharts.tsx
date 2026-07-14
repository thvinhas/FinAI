"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowRight } from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import { cn } from "@/lib/utils";

type DashboardData = {
  saldoTotal: number;
  receitas: number;
  despesas: number;
  byCategory: { name: string; color: string; value: number }[];
  byCategoryReceita: { name: string; color: string; value: number }[];
  previousMonth: { receitas: number; despesas: number; saldoTotal: number } | null;
  monthlyData: { receita: number; despesa: number; saldo: number; label: string };
  economia: { value: number; pct: number };
};

type MonthlyHistoryEntry = { label: string; receita: number; despesa: number };

const currency = (v: number) => `€ ${v.toFixed(2)}`;

const PERIODS = [
  { key: "3", label: "3M", months: 3 },
  { key: "6", label: "6M", months: 6 },
  { key: "12", label: "12M", months: 12 },
  { key: "all", label: "Tudo", months: Infinity },
] as const;

function MonthlyHistoryChart({ history }: { history: MonthlyHistoryEntry[] }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("6");
  const months = PERIODS.find((p) => p.key === period)!.months;
  const data = Number.isFinite(months) ? history.slice(-months) : history;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-heading text-base font-bold">Receita vs Despesa por Mês</h2>
        <div className="flex gap-1 rounded-[10px] bg-surface2 p-[3px]">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                period === p.key ? "bg-surface text-foreground shadow-card" : "text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            cursor={{ fill: "var(--surface2)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const receita = payload.find((p) => p.dataKey === "receita")?.value ?? 0;
              const despesa = payload.find((p) => p.dataKey === "despesa")?.value ?? 0;
              return (
                <div className="flex flex-col gap-0.5 rounded-[10px] border border-border bg-surface3 px-3 py-2 text-xs shadow-card">
                  <div className="font-bold">{label}</div>
                  <div className="font-bold text-positive">{currency(Number(receita))}</div>
                  <div className="font-bold text-negative">{currency(Number(despesa))}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="receita" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="despesa" fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyDonut({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-[22px]">
      <h2 className="font-heading text-[15px] font-bold">{label}</h2>
      <p className="py-5 text-center text-sm text-faint">Sem dados neste mês</p>
    </div>
  );
}

function CategoryDonut({
  title,
  data,
}: {
  title: string;
  data: { name: string; color: string; value: number }[];
}) {
  if (data.length === 0) return <EmptyDonut label={title} />;
  const total = data.reduce((s, c) => s + c.value, 0);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-[22px]">
      <h2 className="font-heading text-[15px] font-bold">{title}</h2>
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative size-28 flex-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} stroke="none">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-[18px] flex items-center justify-center rounded-full bg-surface text-center text-[11px] font-bold text-muted-foreground">
            Total
          </div>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          {data.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2 text-[12.5px]">
              <span className="size-2.5 flex-none rounded-full" style={{ background: cat.color }} />
              <span className="flex-1 truncate">{cat.name}</span>
              <span className="font-semibold tabular-nums text-muted-foreground">
                {total > 0 ? ((cat.value / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardCharts({
  data,
  history,
}: {
  data: DashboardData;
  history: MonthlyHistoryEntry[];
}) {
  const economiaPct = Math.min(100, Math.max(-100, data.economia.pct));
  const isPositive = economiaPct >= 0;
  const gaugeFraction = Math.min(100, Math.abs(economiaPct));
  const isEmpty =
    data.receitas === 0 &&
    data.despesas === 0 &&
    data.byCategory.length === 0 &&
    data.byCategoryReceita.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Saldo Total"
            value={data.saldoTotal}
            colorClass={data.saldoTotal >= 0 ? "text-positive" : "text-negative"}
            current={data.saldoTotal}
            favorable="up"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface px-5 py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-[20px] bg-surface2">
            <div className="size-6 rounded-full border-[3px] border-faint" />
          </div>
          <p className="font-heading text-lg font-bold">Nenhuma transação encontrada</p>
          <p className="max-w-[340px] text-sm text-muted-foreground">
            Comece registrando sua primeira receita ou despesa para ver seu painel financeiro ganhar vida.
          </p>
          <a
            href="/transactions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-[22px] py-3 text-sm font-bold text-background"
          >
            Criar primeira transação
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  const gaugeData = [
    { value: gaugeFraction, fill: isPositive ? "var(--positive)" : "var(--negative)" },
    { value: 100 - gaugeFraction, fill: "var(--surface2)" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Saldo Total"
          value={data.saldoTotal}
          colorClass={data.saldoTotal >= 0 ? "text-positive" : "text-negative"}
          current={data.saldoTotal}
          previous={data.previousMonth?.saldoTotal}
          favorable="up"
        />
        <SummaryCard
          label="Receitas"
          value={data.receitas}
          colorClass="text-positive"
          current={data.receitas}
          previous={data.previousMonth?.receitas}
          favorable="up"
        />
        <SummaryCard
          label="Despesas"
          value={data.despesas}
          colorClass="text-negative"
          current={data.despesas}
          previous={data.previousMonth?.despesas}
          favorable="down"
        />
      </div>

      <MonthlyHistoryChart history={history} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-[22px]">
          <h2 className="font-heading text-[15px] font-bold">Receita vs Despesa</h2>
          <div className="flex h-40 items-end gap-7 px-5">
            <div className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="text-[13px] font-bold tabular-nums text-positive">{currency(data.receitas)}</div>
              <div
                className="w-14 rounded-t-lg bg-positive"
                style={{
                  height: `${data.receitas + data.despesas > 0 ? (data.receitas / (data.receitas + data.despesas)) * 100 : 0}%`,
                }}
              />
              <div className="text-xs font-semibold text-muted-foreground">Receita</div>
            </div>
            <div className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="text-[13px] font-bold tabular-nums text-negative">{currency(data.despesas)}</div>
              <div
                className="w-14 rounded-t-lg bg-negative"
                style={{
                  height: `${data.receitas + data.despesas > 0 ? (data.despesas / (data.receitas + data.despesas)) * 100 : 0}%`,
                }}
              />
              <div className="text-xs font-semibold text-muted-foreground">Despesa</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-5 sm:p-[22px]">
          <h2 className="self-start font-heading text-[15px] font-bold">Taxa de Economia</h2>
          <div className="relative w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  startAngle={180}
                  endAngle={0}
                  cx="50%"
                  cy="100%"
                  innerRadius={70}
                  outerRadius={86}
                  dataKey="value"
                  stroke="none"
                >
                  {gaugeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-heading text-2xl font-bold">
              {economiaPct.toFixed(0)}%
            </div>
          </div>
          <div className="text-[12.5px] text-muted-foreground">do total economizado no mês</div>
        </div>

        <CategoryDonut title="Receitas por Categoria" data={data.byCategoryReceita} />
        <CategoryDonut title="Despesas por Categoria" data={data.byCategory} />
      </div>
    </div>
  );
}
