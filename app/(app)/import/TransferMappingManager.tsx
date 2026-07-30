"use client"

import { useState } from "react"
import { ArrowRightLeft, ArrowRight } from "lucide-react"
import { deleteTransferMapping, updateTransferMapping } from "@/actions/import-transfer-mappings"
import type { TransferMapping } from "@/types/import"
import type { Account } from "@/types/database"
import SearchSelect from "@/components/SearchSelect"

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
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5.5">
      <h2 className="text-[15px] font-bold">Mapeamento de Transferências</h2>
      <p className="text-[12.5px] text-muted-foreground">
        Quando uma transação importada na &quot;conta de origem&quot; tiver a
        descrição contendo o texto de um mapeamento salvo, ela vira transferência
        entre as duas contas abaixo, na direção da seta. Deixe &quot;conta de
        origem&quot; em branco pra aplicar em qualquer conta importada
        (comportamento antigo — mais fácil de acertar por engano em conta errada).
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-faint">
          Nenhum mapeamento salvo. Mapeamentos são criados automaticamente ao
          marcar uma transação como transferência durante a importação.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((m) => {
            const [fromName, toName] =
              m.transfer_type === "destination"
                ? [getAccountName(m.source_account_id), getAccountName(m.account_id)]
                : [getAccountName(m.account_id), getAccountName(m.source_account_id)]
            return (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-lg bg-surface2 px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowRightLeft size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {m.description}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="max-w-24 truncate">{fromName}</span>
                    <ArrowRight size={12} className="text-faint" />
                    <span className="max-w-24 truncate font-medium text-foreground">{toName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={loading === m.id}
                    className="shrink-0 text-xs font-semibold text-negative transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <span className="text-xs text-muted-foreground">Conta de origem (opcional):</span>
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

                  <span className="text-xs text-muted-foreground">
                    é {m.transfer_type === "origin" ? "origem" : "destino"} de:
                  </span>
                  <div className="flex overflow-hidden rounded-full border border-border">
                    <button
                      type="button"
                      onClick={() => handleChange(m.id, { transfer_type: "origin" })}
                      disabled={loading === m.id}
                      className={`px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                        m.transfer_type === "origin"
                          ? "bg-transfer-soft text-transfer"
                          : "text-muted-foreground hover:text-foreground"
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
                          ? "bg-accent-soft text-accent"
                          : "text-muted-foreground hover:text-foreground"
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
