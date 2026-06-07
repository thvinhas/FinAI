"use client";

import { deleteTransaction } from "@/actions/transactions";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import SearchSelect from "@/components/SearchSelect";
import type { Transaction } from "@/types/database";

type FilterItem = { id: string; name: string; color?: string };

export default function TransactionList({
  transactions,
  receitas,
  despesas,
  saldo,
  accounts,
  categories,
  selectedAccount,
  selectedCategory,
}: {
  transactions: Transaction[];
  receitas: number;
  despesas: number;
  saldo: number;
  accounts: FilterItem[];
  categories: FilterItem[];
  selectedAccount: string;
  selectedCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/transactions?${p.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <Wallet size={22} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Saldo</p>
            <p
              className={`truncate text-lg font-bold sm:text-2xl ${
                saldo >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              R$ {saldo.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <TrendingUp size={22} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Receitas</p>
            <p className="truncate text-lg font-bold text-emerald-400 sm:text-2xl">
              R$ {receitas.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 sm:h-12 sm:w-12">
            <TrendingDown size={22} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 sm:text-sm">Despesas</p>
            <p className="truncate text-lg font-bold text-red-400 sm:text-2xl">
              R$ {despesas.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchSelect
          value={selectedAccount}
          onChange={(v) => setFilter("account", v)}
          placeholder="Todas as contas"
          searchPlaceholder="Buscar conta..."
          className="min-w-[160px]"
          options={[
            { value: "", label: "Todas as contas" },
            ...accounts.map((a) => ({
              value: a.id,
              label: a.name,
              color: a.color,
            })),
          ]}
        />

        <SearchSelect
          value={selectedCategory}
          onChange={(v) => setFilter("category", v)}
          placeholder="Todas as categorias"
          searchPlaceholder="Buscar categoria..."
          className="min-w-[160px]"
          options={[
            { value: "", label: "Todas as categorias" },
            ...categories.map((c) => ({
              value: c.id,
              label: c.name,
              color: c.color,
            })),
          ]}
        />

        {(selectedAccount || selectedCategory) && (
          <button
            onClick={() => router.push("/transactions")}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-red-500 hover:text-red-400"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="mb-4 text-zinc-500">
            {selectedAccount || selectedCategory
              ? "Nenhuma transação encontrada com esses filtros."
              : "Nenhuma transação cadastrada."}
          </p>
          {!selectedAccount && !selectedCategory && (
            <a
              href="/transactions/new"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Criar primeira transação
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">
                  Data
                </th>
                <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">
                  Descrição
                </th>
                <th className="hidden px-3 py-3 font-medium text-zinc-400 sm:table-cell sm:px-4">
                  Conta
                </th>
                <th className="hidden px-3 py-3 font-medium text-zinc-400 sm:table-cell sm:px-4">
                  Categoria
                </th>
                <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">
                  Valor
                </th>
                <th className="px-3 py-3 sm:px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {transactions.map((t) => (
                <tr key={t.id} className="bg-zinc-950 hover:bg-zinc-900/50">
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-300 sm:px-4">
                    {new Date(t.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-3 text-white sm:max-w-none sm:px-4">
                    {t.type === "transferencia" ? (
                      <span className="text-indigo-400">Transferência</span>
                    ) : (
                      t.description
                    )}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                    {t.type === "transferencia" ? (
                      <div className="flex items-center gap-1.5">
                        {t.accounts ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: t.accounts.color + "20",
                              color: t.accounts.color,
                            }}
                          >
                            {t.accounts.name}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                        <span className="text-zinc-500">→</span>
                        {t.destination_account ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor:
                                t.destination_account.color + "20",
                              color: t.destination_account.color,
                            }}
                          >
                            {t.destination_account.name}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </div>
                    ) : t.accounts ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: t.accounts.color + "20",
                          color: t.accounts.color,
                        }}
                      >
                        {t.accounts.name}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                    {t.categories ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: t.categories.color + "20",
                          color: t.categories.color,
                        }}
                      >
                        {t.categories.name}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3 font-medium sm:px-4 ${
                      t.type === "receita"
                        ? "text-emerald-400"
                        : t.type === "transferencia"
                          ? "text-indigo-400"
                          : "text-red-400"
                    }`}
                  >
                    {t.type === "receita"
                      ? "+"
                      : t.type === "transferencia"
                        ? "⇄"
                        : "-"}
                    R$ {Number(t.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <form
                      action={async () => {
                        await deleteTransaction(t.id);
                        router.refresh();
                      }}
                    >
                      <button
                        type="submit"
                        className="text-sm text-zinc-600 transition-colors hover:text-red-400"
                      >
                        <span className="hidden sm:inline">Excluir</span>
                        <span className="sm:hidden">✕</span>
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
