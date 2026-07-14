"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { getIgnoreKeywords, addIgnoreKeyword, removeIgnoreKeyword } from "@/actions/import-ignore-keywords"
import { cn } from "@/lib/utils"

const DEFAULT_IGNORE_KEYWORDS = [
  "vdc", "vdp", "vda", "sld", "saldo", "anterior",
  "total", "extrato", "processado", "estorno",
]

export default function IgnoreKeywordManager({
  onKeywordsChange,
}: {
  onKeywordsChange?: (keywords: string[]) => void
}) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIgnoreKeywords().then((kw) => {
      setKeywords(kw)
      onKeywordsChange?.(kw)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    setError("")
    const kw = newKeyword.trim()
    if (!kw) return
    if (DEFAULT_IGNORE_KEYWORDS.includes(kw.toLowerCase())) {
      setError("Essa palavra-chave já existe por padrão.")
      return
    }
    const result = await addIgnoreKeyword(kw)
    if (result?.error) {
      setError(result.error)
    } else {
      const updated = [...keywords, kw.toLowerCase()].sort()
      setKeywords(updated)
      onKeywordsChange?.(updated)
      setNewKeyword("")
    }
  }

  async function handleRemove(kw: string) {
    await removeIgnoreKeyword(kw)
    const updated = keywords.filter((k) => k !== kw)
    setKeywords(updated)
    onKeywordsChange?.(updated)
  }

  const allKeywords = [...new Set([...DEFAULT_IGNORE_KEYWORDS, ...keywords])].sort()

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold">Palavras-chave para Ignorar</h2>
      <p className="text-xs text-muted-foreground">
        Transações cuja descrição conter estas palavras serão automaticamente
        ignoradas na importação. Palavras padrão: {DEFAULT_IGNORE_KEYWORDS.join(", ")}.
      </p>
      <div className="flex gap-2">
        <input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nova palavra..."
          className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:text-accent"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
      {loading ? (
        <p className="text-xs text-faint">Carregando...</p>
      ) : allKeywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allKeywords.map((kw) => {
            const isDefault = DEFAULT_IGNORE_KEYWORDS.includes(kw) && !keywords.includes(kw)
            return (
              <span
                key={kw}
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1 text-xs font-medium",
                  isDefault ? "text-faint" : "text-foreground"
                )}
              >
                {kw}
                {!isDefault && (
                  <button
                    type="button"
                    onClick={() => handleRemove(kw)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-faint">Nenhuma palavra personalizada.</p>
      )}
    </div>
  )
}
