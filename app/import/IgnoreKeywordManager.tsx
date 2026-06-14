"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { getIgnoreKeywords, addIgnoreKeyword, removeIgnoreKeyword } from "@/actions/import-ignore-keywords"

const DEFAULT_IGNORE_KEYWORDS = [
  "vdc", "vdp", "vda", "sld", "saldo", "anterior",
  "total", "extrato", "processado", "estorno",
]

export default function IgnoreKeywordManager({
  onKeywordsChange,
  showTitle,
}: {
  onKeywordsChange?: (keywords: string[]) => void
  showTitle?: boolean
}) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)

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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {showTitle && (
        <h2 className="mb-3 text-sm font-medium text-white">
          Palavras para ignorar
        </h2>
      )}
      <p className="mb-3 text-xs text-zinc-500">
        Transações cuja descrição conter estas palavras serão automaticamente
        ignoradas na importação. Palavras padrão: {DEFAULT_IGNORE_KEYWORDS.join(", ")}.
      </p>
      <div className="flex gap-2">
        <input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nova palavra..."
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white hover:bg-zinc-600 transition-colors"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">Carregando...</p>
      ) : allKeywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {allKeywords.map((kw) => {
            const isDefault = DEFAULT_IGNORE_KEYWORDS.includes(kw) && !keywords.includes(kw)
            return (
              <span
                key={kw}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                  isDefault
                    ? "bg-zinc-800 text-zinc-500"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {kw}
                {!isDefault && (
                  <button
                    type="button"
                    onClick={() => handleRemove(kw)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">Nenhuma palavra personalizada.</p>
      )}
    </div>
  )
}
