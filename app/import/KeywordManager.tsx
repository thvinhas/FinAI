"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { getImportKeywords, addImportKeyword, removeImportKeyword } from "@/actions/import-keywords"

const DEFAULT_KEYWORDS = ["ted", "pix", "doc", "transferencia", "transferência", "pagamento de boleto", "recarga", "portabilidade"]

export default function KeywordManager({ onKeywordsChange, showTitle }: { onKeywordsChange?: (keywords: string[]) => void; showTitle?: boolean }) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(showTitle ?? false)

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
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-neutral-400 hover:text-white transition-colors"
      >
        {open ? "Ocultar" : "Gerenciar"} palavras-chave de transferência
      </button>
      {open && (
        <div className={showTitle ? "rounded-lg border border-zinc-800 bg-zinc-900/50 p-4" : "mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"}>
          {showTitle && (
            <h2 className="mb-3 text-sm font-medium text-white">
              Palavras-chave de transferência
            </h2>
          )}
          <p className="mb-3 text-xs text-neutral-500">
            Palavras-chave que indicam transferência (válidas para CSV e OFX).
            As padrão sempre são aplicadas: {DEFAULT_KEYWORDS.join(", ")}.
          </p>
          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nova palavra-chave..."
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1 rounded-md bg-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-600 transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          {loading ? (
            <p className="mt-3 text-xs text-neutral-500">Carregando...</p>
          ) : keywords.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemove(kw)}
                    className="text-neutral-500 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-neutral-600">Nenhuma palavra-chave personalizada.</p>
          )}
        </div>
      )}
    </div>
  )
}
