"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

type DashboardData = {
  saldoTotal: number;
  receitas: number;
  despesas: number;
  byCategory: { name: string; color: string; value: number }[];
  byCategoryReceita: { name: string; color: string; value: number }[];
  recentes: { amount: number; type: string; date: string }[];
  monthlyData: { receita: number; despesa: number; saldo: number; label: string };
  economia: { value: number; pct: number };
};

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const economiaPct = Math.min(100, Math.abs(data.economia.pct));
  const isPositive = data.economia.pct >= 0;
  const isEmpty =
    data.receitas === 0 &&
    data.despesas === 0 &&
    data.byCategory.length === 0 &&
    data.byCategoryReceita.length === 0;

  const gaugeData = [
    {
      name: isPositive ? "Economizado" : "Déficit",
      value: economiaPct,
      fill: isPositive ? "#34d399" : "#f87171",
    },
    { name: "Restante", value: 100 - economiaPct, fill: "#27272a" },
  ];

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
              <Wallet size={22} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 sm:text-sm">Saldo Total</p>
              <p className="truncate text-lg font-bold text-emerald-400 sm:text-2xl">
                R$ {data.saldoTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="mb-2 text-lg font-medium text-white">
            Bem-vindo ao FinApp!
          </p>
          <p className="mb-6 text-sm text-zinc-400">
            Nenhuma movimentação encontrada neste mês. Crie sua primeira
            transação para começar.
          </p>
          <a
            href="/transactions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Criar primeira transação
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <Wallet size={22} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Saldo Total</p>
            <p
              className={`truncate text-lg font-bold sm:text-2xl ${
                data.saldoTotal >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              R$ {data.saldoTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <TrendingUp size={22} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Receitas (mês)</p>
            <p className="truncate text-lg font-bold text-emerald-400 sm:text-2xl">
              R$ {data.receitas.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <TrendingDown size={22} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Despesas (mês)</p>
            <p className="truncate text-lg font-bold text-red-400 sm:text-2xl">
              R$ {data.despesas.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-white sm:text-lg">
            Balanço Mensal
          </h2>
          {data.receitas === 0 && data.despesas === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhum movimento em {data.monthlyData.label}.
            </p>
          ) : (
            <div className="-mx-2">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={[
                    { name: "Receita", valor: data.receitas, fill: "#34d399" },
                    { name: "Despesa", valor: data.despesas, fill: "#f87171" },
                  ]}
                  barGap={4}
                  barCategoryGap={0}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown) =>
                      `R$ ${Number(value).toFixed(2)}`
                    }
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                  <Bar
                    dataKey="valor"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={160}
                  >
                    {[
                      { valor: data.receitas, fill: "#34d399" },
                      { valor: data.despesas, fill: "#f87171" },
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
              Receita
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
              Despesa
            </span>
          </div>
        </div>

        <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-white sm:text-lg">
            Economia do Mês
          </h2>
          {data.receitas === 0 && data.despesas === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum movimento neste mês.</p>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={gaugeData}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                    stroke="none"
                  >
                    {gaugeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={() => ""}
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <p
                  className={`text-3xl font-bold sm:text-4xl ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {data.economia.pct.toFixed(0)}%
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  R$ {Math.abs(data.economia.value).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPositive ? "economizado" : "no vermelho"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-white sm:text-lg">
            Receitas por Categoria
          </h2>
          {data.byCategoryReceita.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma receita neste mês.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ResponsiveContainer width="100%" height={240} className="max-w-[240px]">
                <PieChart>
                  <Pie
                    data={data.byCategoryReceita}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    stroke="none"
                  >
                    {data.byCategoryReceita.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const total = data.byCategoryReceita.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                      return [`R$ ${Number(value).toFixed(2)} (${pct}%)`, name];
                    }}
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5 sm:flex-col">
                {data.byCategoryReceita.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded"
                      style={{ background: cat.color }}
                    />
                    <span className="text-zinc-400">{cat.name}</span>
                    <span className="ml-auto font-medium text-white">
                      R$ {cat.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-white sm:text-lg">
            Despesas por Categoria
          </h2>
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma despesa neste mês.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ResponsiveContainer width="100%" height={240} className="max-w-[240px]">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    stroke="none"
                  >
                    {data.byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const total = data.byCategory.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                      return [`R$ ${Number(value).toFixed(2)} (${pct}%)`, name];
                    }}
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5 sm:flex-col">
                {data.byCategory.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded"
                      style={{ background: cat.color }}
                    />
                    <span className="text-zinc-400">{cat.name}</span>
                    <span className="ml-auto font-medium text-white">
                      R$ {cat.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
