"use client";

import { deleteTransaction } from "@/actions/transactions";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, Pencil, Trash2, Calendar } from "lucide-react";
import SearchSelect from "@/components/SearchSelect";
import DataTable from "@/components/DataTable";
import MobileTransactionCards from "@/components/MobileTransactionCards";
import type { Transaction } from "@/types/database";
import type { ColumnDef } from "@tanstack/react-table";

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
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/transactions?${p.toString()}`);
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => (
        <span className="text-zinc-300">
          {new Date(row.original.date).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => {
        const t = row.original;
        return t.type === "transferencia" ? (
          <span className="text-indigo-400">Transferência</span>
        ) : (
          <span className="max-w-[140px] truncate text-white sm:max-w-none">
            {t.description}
          </span>
        );
      },
    },
    {
      accessorKey: "account",
      header: "Conta",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "transferencia") {
          return (
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
          );
        }
        return t.accounts ? (
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
        );
      },
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => {
        const c = row.original.categories;
        return c ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            style={{
              backgroundColor: c.color + "20",
              color: c.color,
            }}
          >
            {c.name}
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Valor",
      sortingFn: "basic",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <span
            className={`font-medium ${
              t.type === "receita"
                ? "text-emerald-400"
                : t.type === "transferencia"
                  ? "text-indigo-400"
                  : "text-red-400"
            }`}
          >
            {t.type === "receita" ? "+" : t.type === "transferencia" ? "⇄" : "-"}
            € {Number(t.amount).toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-center gap-2">
            <a
              href={`/transactions/${t.id}/edit`}
              className="text-zinc-600 transition-colors hover:text-indigo-400"
            >
              <Pencil size={15} />
            </a>
            <form
              onSubmit={(e) => {
                if (!confirm("Excluir esta transação?")) e.preventDefault();
              }}
              action={async () => {
                await deleteTransaction(t.id);
                router.refresh();
              }}
            >
              <button
                type="submit"
                className="text-zinc-600 transition-colors hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </form>
          </div>
        );
      },
    },
  ];

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
              € {saldo.toFixed(2)}
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
              € {receitas.toFixed(2)}
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
              € {despesas.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setFilter("dateFrom", e.target.value)}
              className="w-[140px] rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-8 pr-2.5 text-sm text-white outline-none transition-all hover:border-zinc-600 focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-zinc-500">até</span>
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setFilter("dateTo", e.target.value)}
              className="w-[140px] rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-8 pr-2.5 text-sm text-white outline-none transition-all hover:border-zinc-600 focus:border-indigo-500"
            />
          </div>
        </div>

        {(selectedAccount || selectedCategory || dateFrom || dateTo) && (
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
        <>
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={transactions}
              searchKey="description"
              searchPlaceholder="Buscar por descrição..."
              pageSize={10}
            />
          </div>
          <MobileTransactionCards transactions={transactions} />
        </>
      )}
    </div>
  );
}
