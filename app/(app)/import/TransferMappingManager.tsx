"use client"

import { useState } from "react"
import { ArrowRightLeft, ArrowUp, ArrowDown } from "lucide-react"
import { deleteTransferMapping } from "@/actions/import-transfer-mappings"
import type { TransferMapping } from "@/types/import"
import type { Account } from "@/types/database"

export default function TransferMappingManager({
  mappings,
  accounts,
  onMappingsChange,
}: {
  mappings: TransferMapping[]
  accounts: Account[]
  onMappingsChange?: (mappings: TransferMapping[]) => void
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
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5.5">
      <h2 className="text-[15px] font-bold">Mapeamento de Transferências</h2>
      <p className="text-[12.5px] text-muted-foreground">
        Quando uma transação importada tiver a descrição igual a um mapeamento
        salvo, ela será automaticamente marcada como transferência com a conta
        correspondente.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-faint">
          Nenhum mapeamento salvo. Mapeamentos são criados automaticamente ao
          marcar uma transação como transferência durante a importação.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface2 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <ArrowRightLeft size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">
                  {m.description}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
                  {m.transfer_type === "origin" ? (
                    <ArrowUp size={10} className="text-transfer" />
                  ) : (
                    <ArrowDown size={10} className="text-accent" />
                  )}
                  {m.transfer_type === "origin" ? "Origem" : "Destino"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {getAccountName(m.account_id)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={loading}
                className="shrink-0 text-xs font-semibold text-negative transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
