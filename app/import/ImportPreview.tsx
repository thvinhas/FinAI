"use client"

import { useState, useEffect, useMemo } from "react"
import { Trash2, ArrowRight, ArrowLeft, Plus, X } from "lucide-react"
import SearchSelect from "@/components/SearchSelect"
import { createCategory } from "@/actions/categories"
import type { ParsedTransaction } from "@/types/import"
import type { Category, Account } from "@/types/database"
import { formatCurrency } from "@/lib/format"

const CATEGORY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4", "#22c55e", "#a855f7",
  "#e11d48", "#0ea5e9", "#d946ef", "#84cc16",
  "#f43f5e", "#64748b", "#fb923c", "#2dd4bf",
  "#eab308", "#475569", "#a78bfa", "#34d399",
]

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
  const [localCategories, setLocalCategories] = useState(categories)
  const [addCategoryFor, setAddCategoryFor] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")

  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  async function handleAddCategory(e: React.FormEvent, rowIndex: number, catType: string) {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    const usedColors = new Set(
      localCategories.filter((c) => c.type === catType).map((c) => c.color)
    )
    const suggestedColor = CATEGORY_COLORS.find((c) => !usedColors.has(c)) ?? CATEGORY_COLORS[0]

    const formData = new FormData()
    formData.set("name", newCategoryName.trim())
    formData.set("type", catType)
    formData.set("color", suggestedColor)

    const result = await createCategory(formData)
    if (result?.error) return

    const newCat: Category = {
      id: result.id,
      user_id: "",
      name: newCategoryName.trim(),
      type: catType as "receita" | "despesa",
      color: suggestedColor,
      icon: "tag",
      created_at: new Date().toISOString(),
      archived_at: null,
    }

    setLocalCategories((prev) => [...prev, newCat])
    onUpdate(rowIndex, { category_id: result.id })
    setAddCategoryFor(null)
    setNewCategoryName("")
  }
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
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
      case "receita": return "bg-emerald-900/50 text-emerald-400"
      case "despesa": return "bg-red-900/50 text-red-400"
      case "transferencia": return "bg-indigo-900/50 text-indigo-400"
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

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <div className="hidden text-xs font-medium text-zinc-500 sm:grid sm:grid-cols-[1fr_2fr_1fr_100px_1fr_40px]">
        <div className="px-4 py-3">Data</div>
        <div className="px-4 py-3">Descrição</div>
        <div className="px-4 py-3">Valor</div>
        <div className="px-4 py-3">Tipo</div>
        <div className="px-4 py-3">Categoria / Conta</div>
        <div className="px-4 py-3" />
      </div>

      <div className="divide-y divide-zinc-800">
        {transactions.map((tx, i) => (
          <div
            key={i}
            className={`grid gap-2 p-3 text-sm sm:grid-cols-[1fr_2fr_1fr_100px_1fr_40px] sm:items-center sm:gap-0 sm:px-4 sm:py-2.5 ${
              i % 2 === 0 ? "bg-zinc-900/30" : ""
            }`}
          >
            {/* Date */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-zinc-500 sm:hidden">Data </span>
              <input
                type="date"
                value={tx.date}
                onChange={(e) => onUpdate(i, { date: e.target.value })}
                className="w-full rounded bg-transparent px-1 py-1 text-white outline-none focus:bg-zinc-800"
              />
            </div>

            {/* Description */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-zinc-500 sm:hidden">Descrição </span>
              <input
                type="text"
                value={tx.description}
                onChange={(e) =>
                  onUpdate(i, { description: e.target.value })
                }
                className="w-full rounded bg-transparent px-1 py-1 text-white outline-none focus:bg-zinc-800"
              />
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-zinc-500 sm:hidden">Valor </span>
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
                className="w-full rounded bg-transparent px-1 py-1 text-white outline-none focus:bg-zinc-800"
              />
            </div>

            {/* Type toggle */}
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs text-zinc-500 sm:hidden">Tipo </span>
              <button
                onClick={() => onUpdate(i, nextType(tx))}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${typeColors(tx)}`}
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
                      <span className="text-xs text-zinc-500 sm:hidden">
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
                      <span className="text-xs text-zinc-500 sm:hidden">
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
                  <span className="text-xs text-zinc-500 sm:hidden">Categoria </span>
                  <div className="flex items-center gap-1">
                    <SearchSelect
                      value={tx.category_id ?? ""}
                      onChange={(val: string) =>
                        onUpdate(i, { category_id: val || null })
                      }
                      placeholder="Sem categoria"
                      searchPlaceholder="Buscar categoria..."
                      onAddLabel="+ Adicionar"
                      onAdd={() => {
                        setAddCategoryFor(i)
                        setNewCategoryName("")
                      }}
                      options={[
                        { value: "", label: "Sem categoria" },
                        ...localCategories
                          .filter((c) => c.type === tx.type)
                          .map((c) => ({
                            value: c.id,
                            label: c.name,
                            color: c.color,
                          })),
                      ]}
                    />
                  </div>
                  {addCategoryFor === i && (
                    <form
                      onSubmit={(e) => handleAddCategory(e, i, tx.type)}
                      className="mt-1 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome"
                        autoFocus
                        className="flex-1 rounded border border-zinc-700 bg-zinc-900/50 px-2 py-1 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddCategoryFor(null)
                          setNewCategoryName("")
                        }}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Remove */}
            <div className="flex items-center justify-end sm:block">
              <button
                onClick={() => onRemove(i)}
                className="rounded p-1 text-zinc-600 transition-colors hover:text-red-400"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
