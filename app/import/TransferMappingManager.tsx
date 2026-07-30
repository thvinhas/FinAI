"use client"

import { useState } from "react"
import { Trash2, ArrowRightLeft, ArrowRight } from "lucide-react"
import { deleteTransferMapping, updateTransferMapping } from "@/actions/import-transfer-mappings"
import type { TransferMapping } from "@/types/import"
import type { Account } from "@/types/database"
import SearchSelect from "@/components/SearchSelect"

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
  const [loading, setLoading] = useState<string | null>(null)

  function getAccountName(accountId: string | null) {
    if (!accountId) return "qualquer conta"
    return accounts.find((a) => a.id === accountId)?.name ?? accountId.substring(0, 8) + "..."
  }

  async function handleDelete(id: string) {
    setLoading(id)
    await deleteTransferMapping(id)
    const updated = items.filter((m) => m.id !== id)
    setItems(updated)
    onMappingsChange?.(updated)
    setLoading(null)
  }

  async function handleChange(
    id: string,
    updates: Partial<Pick<TransferMapping, "transfer_type" | "account_id" | "source_account_id">>,
  ) {
    const current = items.find((m) => m.id === id)
    if (!current) return
    const next = { ...current, ...updates }
    setLoading(id)
    const updated = items.map((m) => (m.id === id ? next : m))
    setItems(updated)
    onMappingsChange?.(updated)
    await updateTransferMapping(id, next.transfer_type, next.account_id, next.source_account_id)
    setLoading(null)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {showTitle && (
        <h2 className="mb-3 text-sm font-medium text-white">
          Mapeamentos de transferência
        </h2>
      )}
      <p className="mb-3 text-xs text-zinc-500">
        Quando uma transação importada na &quot;conta de origem&quot; tiver a
        descrição contendo o texto de um mapeamento salvo, ela vira transferência
        entre as duas contas abaixo, na direção da seta. Deixe &quot;conta de
        origem&quot; em branco pra aplicar em qualquer conta importada (comportamento
        antigo — mais fácil de acertar por engano em conta errada).
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">
          Nenhum mapeamento salvo. Mapeamentos são criados automaticamente ao
          marcar uma transação como transferência durante a importação.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => {
            const [fromName, toName] =
              m.transfer_type === "destination"
                ? [getAccountName(m.source_account_id), getAccountName(m.account_id)]
                : [getAccountName(m.account_id), getAccountName(m.source_account_id)]
            return (
              <div
                key={m.id}
                className="space-y-2 rounded-md border border-zinc-800 bg-zinc-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft size={14} className="shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                    {m.description}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
                    <span className="max-w-24 truncate">{fromName}</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="max-w-24 truncate font-medium text-zinc-200">{toName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={loading === m.id}
                    className="shrink-0 rounded p-1 text-zinc-600 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <span className="text-xs text-zinc-500">Conta de origem (opcional):</span>
                  <SearchSelect
                    className="w-44"
                    placeholder="Qualquer conta"
                    searchPlaceholder="Buscar conta..."
                    value={m.source_account_id ?? ""}
                    onChange={(v) => handleChange(m.id, { source_account_id: v || null })}
                    options={[
                      { value: "", label: "Qualquer conta" },
                      ...accounts.map((a) => ({ value: a.id, label: a.name, color: a.color })),
                    ]}
                  />

                  <span className="text-xs text-zinc-500">é {m.transfer_type === "origin" ? "origem" : "destino"} de:</span>
                  <div className="flex overflow-hidden rounded-full border border-zinc-700">
                    <button
                      type="button"
                      onClick={() => handleChange(m.id, { transfer_type: "origin" })}
                      disabled={loading === m.id}
                      className={`px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                        m.transfer_type === "origin"
                          ? "bg-orange-900/40 text-orange-300"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Origem
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange(m.id, { transfer_type: "destination" })}
                      disabled={loading === m.id}
                      className={`px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                        m.transfer_type === "destination"
                          ? "bg-blue-900/40 text-blue-300"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Destino
                    </button>
                  </div>
                  <SearchSelect
                    className="w-44"
                    placeholder="Conta"
                    searchPlaceholder="Buscar conta..."
                    value={m.account_id}
                    onChange={(v) => handleChange(m.id, { account_id: v })}
                    options={accounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                      color: a.color,
                    }))}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
