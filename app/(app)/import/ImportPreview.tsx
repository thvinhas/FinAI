"use client"

import { ArrowRight, ArrowLeft } from "lucide-react"
import SearchSelect from "@/components/SearchSelect"
import type { ParsedTransaction } from "@/types/import"
import type { Category, Account } from "@/types/database"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function ImportPreview({
  transactions,
  categories,
  accounts,
  accountId,
  onUpdate,
  onRemove,
}: {
  transactions: ParsedTransaction[]
  categories: Category[]
  accounts: Account[]
  accountId: string
  onUpdate: (index: number, updates: Partial<ParsedTransaction>) => void
  onRemove: (index: number) => void
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-faint">
        Nenhuma transação encontrada no arquivo.
      </p>
    )
  }

  const typeLabel = (t: ParsedTransaction) => {
    switch (t.type) {
      case "receita": return "+ Receita"
      case "despesa": return "- Despesa"
      case "transferencia": return "↔ Transf."
    }
  }

  const typeColors = (t: ParsedTransaction) => {
    switch (t.type) {
      case "receita": return "bg-positive-soft text-positive"
      case "despesa": return "bg-negative-soft text-negative"
      case "transferencia": return "bg-transfer-soft text-transfer"
    }
  }

  const nextType = (t: ParsedTransaction): Partial<ParsedTransaction> => {
    if (t.type === "receita")
      return { type: "transferencia", category_id: null, destination_account_id: null, origin_account_id: "" }
    if (t.type === "despesa")
      return { type: "transferencia", category_id: null, destination_account_id: "", origin_account_id: null }
    return { type: "despesa", destination_account_id: null, origin_account_id: null }
  }

  const otherAccounts = accounts.filter((a) => a.id !== accountId)

  const destOptions = [
    { value: "", label: "Selecione a conta de destino" },
    ...otherAccounts.map((a) => ({
      value: a.id,
      label: `${a.name} (€ ${Number(a.balance).toFixed(2)})`,
      color: a.color,
    })),
  ]

  const originOptions = [
    { value: "", label: "Selecione a conta de origem" },
    ...otherAccounts.map((a) => ({
      value: a.id,
      label: `${a.name} (€ ${Number(a.balance).toFixed(2)})`,
      color: a.color,
    })),
  ]

  const miniInputClass =
    "w-full rounded-lg bg-transparent px-1.5 py-1.5 text-sm outline-none transition-colors focus:bg-surface2"

  return (
    <div className="fa-import-table-wrap overflow-x-auto rounded-2xl border border-border bg-surface">
      <div className="hidden text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[1fr_2fr_1fr_100px_1fr_90px]">
        <div className="px-4 py-3">Data</div>
        <div className="px-4 py-3">Descrição</div>
        <div className="px-4 py-3">Valor</div>
        <div className="px-4 py-3">Tipo</div>
        <div className="px-4 py-3">Categoria / Conta</div>
        <div className="px-4 py-3" />
      </div>

      <div className="divide-y divide-border">
        {transactions.map((tx, i) => (
          <div
            key={i}
            className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_2fr_1fr_100px_1fr_90px] sm:items-center sm:gap-0 sm:px-4 sm:py-2"
          >
            {/* Date */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-faint sm:hidden">Data </span>
              <input
                type="date"
                value={tx.date}
                onChange={(e) => onUpdate(i, { date: e.target.value })}
                className={miniInputClass}
              />
            </div>

            {/* Description */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-faint sm:hidden">Descrição </span>
              <input
                type="text"
                value={tx.description}
                onChange={(e) =>
                  onUpdate(i, { description: e.target.value })
                }
                className={miniInputClass}
              />
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-faint sm:hidden">Valor </span>
              <input
                type="text"
                inputMode="decimal"
                value={formatCurrency(tx.amount)}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "")
                  const cents = parseInt(digits || "0", 10)
                  onUpdate(i, { amount: cents / 100 })
                }}
                className={cn(miniInputClass, "tabular-nums")}
              />
            </div>

            {/* Type toggle */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-faint sm:hidden">Tipo </span>
              <button
                onClick={() => onUpdate(i, nextType(tx))}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", typeColors(tx))}
              >
                {typeLabel(tx)}
              </button>
            </div>

            {/* Category or Transfer Account */}
            <div className="flex items-center gap-2 sm:block">
              {tx.type === "transferencia" ? (
                <>
                  {tx.origin_account_id !== null && tx.origin_account_id !== undefined ? (
                    <>
                      <span className="text-xs text-faint sm:hidden">
                        <ArrowLeft size={12} className="inline" /> Origem{" "}
                      </span>
                      <SearchSelect
                        value={tx.origin_account_id ?? ""}
                        onChange={(val: string) =>
                          onUpdate(i, { origin_account_id: val || null })
                        }
                        placeholder="Conta de origem"
                        searchPlaceholder="Buscar conta..."
                        options={originOptions}
                      />
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-faint sm:hidden">
                        <ArrowRight size={12} className="inline" /> Destino{" "}
                      </span>
                      <SearchSelect
                        value={tx.destination_account_id ?? ""}
                        onChange={(val: string) =>
                          onUpdate(i, { destination_account_id: val || null })
                        }
                        placeholder="Conta de destino"
                        searchPlaceholder="Buscar conta..."
                        options={destOptions}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs text-faint sm:hidden">Categoria </span>
                  <SearchSelect
                    value={tx.category_id ?? ""}
                    onChange={(val: string) =>
                      onUpdate(i, { category_id: val || null })
                    }
                    placeholder="Sem categoria"
                    searchPlaceholder="Buscar categoria..."
                    options={[
                      { value: "", label: "Sem categoria" },
                      ...categories
                        .filter((c) => c.type === tx.type)
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          color: c.color,
                        })),
                    ]}
                  />
                </>
              )}
            </div>

            {/* Remove */}
            <div className="flex items-center justify-end sm:block sm:text-right">
              <button
                onClick={() => onRemove(i)}
                className="text-xs font-semibold text-negative hover:opacity-80"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
