"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { getImportKeywords, addImportKeyword, removeImportKeyword } from "@/actions/import-keywords"

const DEFAULT_KEYWORDS = ["ted", "pix", "doc", "transferencia", "transferência", "pagamento de boleto", "recarga", "portabilidade"]

export default function KeywordManager({ onKeywordsChange }: { onKeywordsChange?: (keywords: string[]) => void }) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getImportKeywords().then((kw) => {
      setKeywords(kw)
      onKeywordsChange?.(kw)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    setError("")
    const kw = newKeyword.trim()
    if (!kw) return
    if (DEFAULT_KEYWORDS.includes(kw.toLowerCase())) {
      setError("Essa palavra-chave já existe por padrão.")
      return
    }
    const result = await addImportKeyword(kw)
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
    await removeImportKeyword(kw)
    const updated = keywords.filter((k) => k !== kw)
    setKeywords(updated)
    onKeywordsChange?.(updated)
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold">Palavras-chave de Transferência</h2>
      <p className="text-xs text-muted-foreground">
        Palavras-chave que indicam transferência (válidas para CSV e OFX).
        As padrão sempre são aplicadas: {DEFAULT_KEYWORDS.join(", ")}.
      </p>
      <div className="flex gap-2">
        <input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nova palavra-chave..."
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
      ) : keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1 text-xs font-medium"
            >
              {kw}
              <button
                type="button"
                onClick={() => handleRemove(kw)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-faint">Nenhuma palavra-chave personalizada.</p>
      )}
    </div>
  )
}
