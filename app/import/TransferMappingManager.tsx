"use client"

import { useState } from "react"
import { Trash2, ArrowRightLeft, ArrowUp, ArrowDown } from "lucide-react"
import { deleteTransferMapping } from "@/actions/import-transfer-mappings"
import type { TransferMapping } from "@/types/import"
import type { Account } from "@/types/database"

export default function TransferMappingManager({
  mappings,
  accounts,
  onMappingsChange,
  showTitle,
}: {
  mappings: TransferMapping[]
  accounts: Account[]
  onMappingsChange?: (mappings: TransferMapping[]) => void
  showTitle?: boolean
}) {
  const [items, setItems] = useState(mappings)
  const [loading, setLoading] = useState(false)

  function getAccountName(accountId: string) {
    return accounts.find((a) => a.id === accountId)?.name ?? accountId.substring(0, 8) + "..."
  }

  async function handleDelete(id: string) {
    setLoading(true)
    await deleteTransferMapping(id)
    const updated = items.filter((m) => m.id !== id)
    setItems(updated)
    onMappingsChange?.(updated)
    setLoading(false)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {showTitle && (
        <h2 className="mb-3 text-sm font-medium text-white">
          Mapeamentos de transferência
        </h2>
      )}
      <p className="mb-3 text-xs text-zinc-500">
        Quando uma transação importada tiver a descrição igual a um mapeamento
        salvo, ela será automaticamente marcada como transferência com a conta
        correspondente.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">
          Nenhum mapeamento salvo. Mapeamentos são criados automaticamente ao
          marcar uma transação como transferência durante a importação.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ArrowRightLeft size={14} className="shrink-0 text-zinc-500" />
                <span className="truncate text-sm text-zinc-200">
                  {m.description}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {m.transfer_type === "origin" ? (
                    <ArrowUp size={10} className="text-orange-400" />
                  ) : (
                    <ArrowDown size={10} className="text-blue-400" />
                  )}
                  {m.transfer_type === "origin" ? "Origem" : "Destino"}
                </span>
                <span className="text-xs text-zinc-500">
                  {getAccountName(m.account_id)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={loading}
                className="shrink-0 rounded p-1 text-zinc-600 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
