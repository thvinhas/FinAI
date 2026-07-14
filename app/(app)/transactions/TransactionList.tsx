"use client";

import { useState } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import SearchSelect from "@/components/SearchSelect";
import DataTable from "@/components/DataTable";
import MobileTransactionCards from "@/components/MobileTransactionCards";
import SummaryCard from "@/components/SummaryCard";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/database";
import type { ColumnDef } from "@tanstack/react-table";

type FilterItem = { id: string; name: string; color?: string };

const dateInputClass =
  "w-[164px] rounded-lg border border-border bg-background py-2 pl-8 pr-2.5 text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-[3px] focus:ring-accent-soft";

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
  const [search, setSearch] = useState("");

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/transactions?${p.toString()}`);
  };

  const searchLower = search.trim().toLowerCase();
  const mobileFiltered = searchLower
    ? transactions.filter((t) =>
        (t.type === "transferencia" ? "transferência" : (t.description ?? "")).toLowerCase().includes(searchLower)
      )
    : transactions;

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
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
          <span className="text-transfer">Transferência</span>
        ) : (
          <span className="max-w-[140px] truncate font-semibold sm:max-w-none">
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
                    backgroundColor: t.accounts.color + "26",
                    color: t.accounts.color,
                  }}
                >
                  {t.accounts.name}
                </span>
              ) : (
                <span className="text-faint">—</span>
              )}
              <span className="text-faint">→</span>
              {t.destination_account ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor:
                      t.destination_account.color + "26",
                    color: t.destination_account.color,
                  }}
                >
                  {t.destination_account.name}
                </span>
              ) : (
                <span className="text-faint">—</span>
              )}
            </div>
          );
        }
        return t.accounts ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            style={{
              backgroundColor: t.accounts.color + "26",
              color: t.accounts.color,
            }}
          >
            {t.accounts.name}
          </span>
        ) : (
          <span className="text-faint">—</span>
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
              backgroundColor: c.color + "26",
              color: c.color,
            }}
          >
            {c.name}
          </span>
        ) : (
          <span className="text-faint">—</span>
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
            className={cn(
              "font-bold tabular-nums",
              t.type === "receita"
                ? "text-positive"
                : t.type === "transferencia"
                  ? "text-transfer"
                  : "text-negative"
            )}
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
          <div className="flex items-center justify-end gap-4 text-xs font-semibold">
            <a
              href={`/transactions/${t.id}/edit`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Editar
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
                className="text-negative transition-opacity hover:opacity-80"
              >
                Excluir
              </button>
            </form>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">Transações</h1>
        <a
          href="/transactions/new"
          className="rounded-[11px] bg-accent px-[18px] py-2.5 text-[13.5px] font-bold text-background"
        >
          + Nova Transação
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Saldo" value={saldo} colorClass={saldo >= 0 ? "text-positive" : "text-negative"} compact />
        <SummaryCard label="Receitas" value={receitas} colorClass="text-positive" compact />
        <SummaryCard label="Despesas" value={despesas} colorClass="text-negative" compact />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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

          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setFilter("dateFrom", e.target.value)}
              className={dateInputClass}
            />
          </div>
          <span className="text-xs text-muted-foreground">até</span>
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setFilter("dateTo", e.target.value)}
              className={dateInputClass}
            />
          </div>

          {(selectedAccount || selectedCategory || dateFrom || dateTo) && (
            <button
              onClick={() => router.push("/transactions")}
              className="rounded-[10px] border border-border px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-negative"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="mb-4 text-sm text-faint">
            {selectedAccount || selectedCategory
              ? "Nenhuma transação encontrada com esses filtros."
              : "Nenhuma transação cadastrada."}
          </p>
          {!selectedAccount && !selectedCategory && (
            <a
              href="/transactions/new"
              className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background"
            >
              Criar primeira transação
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <DataTable columns={columns} data={transactions} search={search} pageSize={10} />
          </div>
          <MobileTransactionCards transactions={mobileFiltered} />
        </>
      )}
    </div>
  );
}
