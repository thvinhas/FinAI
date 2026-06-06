"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function DashboardCharts({
  data,
}: {
  data: {
    byCategory: { name: string; color: string; value: number }[];
    recentes: { amount: number; type: string; date: string }[];
  };
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Despesas por Categoria
        </h2>
        {data.byCategory.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhuma despesa neste mês.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
              >
                {data.byCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Últimas Transações
        </h2>
        {data.recentes.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma transação ainda.</p>
        ) : (
          <div className="space-y-3">
            {data.recentes.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
              >
                <span
                  className={`text-sm font-medium ${
                    t.type === "receita"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {t.type === "receita" ? "+" : "-"}R${" "}
                  {Number(t.amount).toFixed(2)}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(t.date).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
