"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  X,
} from "lucide-react"
import { applyKeywordMap } from "./categorizer"
import Papa from "papaparse"
import { detectFormat, parseCSV, parseOFX, detectCSVHeaders, autoDetectMapping, filterGarbage, extractGarbageKeywords, parseDate, parseCurrency, cleanDescription } from "./parser"
import KeywordManager from "./KeywordManager"
import IgnoreKeywordManager from "./IgnoreKeywordManager"
import ImportPreview from "./ImportPreview"
import { importTransactions, parsePDFWithLLM, classifyBatch } from "@/actions/import"
import { addIgnoreKeyword } from "@/actions/import-ignore-keywords"
import { getTransferMappings, saveTransferMapping } from "@/actions/import-transfer-mappings"
import type { ParsedTransaction, TransferMapping } from "@/types/import"
import type { Account, Category } from "@/types/database"
import type { SelectOption } from "@/components/SearchSelect"
import SearchSelect from "@/components/SearchSelect"

type Step = "upload" | "preview"

export default function ImportForm({
  accounts,
  categories,
  keywordMap,
  initialIgnoreKeywords,
  initialTransferMappings = [],
}: {
  accounts: Account[]
  categories: Category[]
  keywordMap: Record<string, string>
  initialIgnoreKeywords?: string[]
  initialTransferMappings?: TransferMapping[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [rawText, setRawText] = useState("")

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState("")

  // Import
  const [accountId, setAccountId] = useState("")
  const [importing, setImporting] = useState(false)
  const [pendingDuplicates, setPendingDuplicates] = useState<ParsedTransaction[] | null>(null)
  const [pendingTransferDuplicates, setPendingTransferDuplicates] = useState<ParsedTransaction[] | null>(null)

  // Transfer keywords
  const [transferKeywords, setTransferKeywords] = useState<string[]>([])

  // Ignore keywords
  const [ignoreKeywords, setIgnoreKeywords] = useState<string[]>(initialIgnoreKeywords ?? [])
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])

  // LLM processing
  const [processingLLM, setProcessingLLM] = useState(false)
  const [extractingPDF, setExtractingPDF] = useState(false)

  // Transfer mappings
  const [transferMappings, setTransferMappings] = useState<TransferMapping[]>(initialTransferMappings)

  useEffect(() => {
    getTransferMappings().then(setTransferMappings)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError("")
    setParsing(true)
    setFileName(file.name)

    try {
      let text: string
      if (file.name.toLowerCase().endsWith(".pdf")) {
        setExtractingPDF(true)
        try {
          text = await extractPDFTextClient(file)
          setExtractingPDF(false)
        } catch (e) {
          setExtractingPDF(false)
          setError(e instanceof Error ? e.message : "Erro ao processar PDF")
          setParsing(false)
          return
        }
      } else {
        text = await file.text()
      }
      setRawText(text.substring(0, 20000))
      setParsing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar arquivo")
      setParsing(false)
    }
  }, [])

  function applyCategories(txns: ParsedTransaction[]) {
    const withCats = txns.map((t) => {
      // Apply transfer mappings
      const mapping = transferMappings.find(
        (m) => t.description.toLowerCase().includes(m.description.toLowerCase())
      )
      if (mapping) {
        return {
          ...t,
          type: "transferencia" as const,
          category_id: null,
          destination_account_id: mapping.transfer_type === "destination" ? mapping.account_id : null,
          origin_account_id: mapping.transfer_type === "origin" ? mapping.account_id : null,
        }
      }
      return {
        ...t,
        destination_account_id: t.type !== "transferencia" ? null : t.destination_account_id ?? null,
        origin_account_id: t.type !== "transferencia" ? null : t.origin_account_id ?? null,
        category_id: t.type === "transferencia" ? null : (applyKeywordMap(t.description, keywordMap) ?? t.category_id),
      }
    })
    setTransactions(withCats)
    setProcessingLLM(false)
    setStep("preview")
  }

  async function handleLLMProcess() {
    if (!rawText.trim()) return
    setProcessingLLM(true)
    setError("")

    const fmt = detectFormat(fileName, rawText)

    if (fmt === "csv") {
      processCSV(rawText, transferKeywords, ignoreKeywords)
      return
    }

    const catList = categories.map((c) => ({ id: c.id, name: c.name }))
    console.log("[LLM Process] Ignore keywords:", ignoreKeywords)
    const result = await parsePDFWithLLM(rawText, catList, ignoreKeywords)
    console.log("[LLM Process] Result:", JSON.stringify(result, null, 2))
    if (result?.error) {
      setError(result.error)
      setProcessingLLM(false)
      return
    }
    if (result?.transactions && result.transactions.length > 0) {
      const filtered = filterGarbage(result.transactions, ignoreKeywords)
      if (filtered.length > 0) {
        applyCategories(filtered)
      } else {
        setError("Todas as transações foram filtradas como lixo. Reveja as palavras-chave de ignorar nas configurações.")
        setProcessingLLM(false)
      }
      return
    }

    if (fmt === "ofx") {
      const raw = parseOFX(rawText, transferKeywords)
      const suggestions = extractGarbageKeywords(raw, ignoreKeywords)
      setSuggestedKeywords(suggestions)
      const txns = filterGarbage(raw, ignoreKeywords)
      if (txns.length > 0) {
        applyCategories(txns)
        return
      }
    }

    setError("Nenhuma transação encontrada. Verifique se o texto contém dados de extrato bancário.")
    setProcessingLLM(false)
  }

  async function processCSV(text: string, transferKeywords: string[], ignoreKeywords: string[]) {
    let txns: ParsedTransaction[] = []

    const headers = detectCSVHeaders(text)
    const autoMap = autoDetectMapping(headers)
    if (autoMap) {
      const raw = parseCSV(text, autoMap, transferKeywords)
      const suggestions = extractGarbageKeywords(raw, ignoreKeywords)
      setSuggestedKeywords(suggestions)
      txns = filterGarbage(raw, ignoreKeywords)
    }

    if (txns.length === 0) {
      // Fallback: parse with header=false and auto-detect column positions
      const parsed = Papa.parse(text, { header: false, skipEmptyLines: true })
      const rows = parsed.data as string[][]
      if (rows.length < 2) {
        setError("Nenhuma transação encontrada.")
        setProcessingLLM(false)
        return
      }

      const headerRow = rows[0].map((h) => h.toLowerCase().trim())
      const colDate = headerRow.findIndex((h) => /data|date|dt/.test(h))
      const colDesc = headerRow.findIndex((h) => /descricao|description|desc|historico|memo/.test(h))
      const colDebit = headerRow.findIndex((h) => h.includes("debit"))
      const colCredit = headerRow.findIndex((h) => h.includes("credit"))
      const colAmount = headerRow.findIndex((h) => /^amount$|valor|value|montante/.test(h))
      const colType = headerRow.findIndex((h) => /\b(?:type|tipo|transaction)\b/.test(h))

      const dataRows = rows.slice(1)
      txns = dataRows
        .map((row): ParsedTransaction | null => {
          const date = colDate >= 0 ? parseDate(row[colDate] ?? "") : null
          const description = colDesc >= 0 ? cleanDescription((row[colDesc] ?? "").trim()) : null
          if (!date || !description) return null

          const rawType = colType >= 0 ? (row[colType] ?? "").toLowerCase() : ""
          let isCredit = rawType.includes("cred") || rawType === "credit"

          let amount = 0
          if (colDebit >= 0 && colCredit >= 0) {
            const debit = parseCurrency(row[colDebit] ?? "")
            const credit = parseCurrency(row[colCredit] ?? "")
            amount = isCredit && credit > 0 ? credit : debit > 0 ? debit : credit || debit || 0
          } else if (colAmount >= 0) {
            const raw = parseCurrency(row[colAmount] ?? "")
            if (raw > 0) {
              isCredit = true
              amount = raw
            } else if (raw < 0) {
              isCredit = false
              amount = -raw
            }
          }
          if (!amount) return null

          return {
            date,
            description,
            amount: Math.abs(amount),
            type: isCredit ? "receita" as const : "despesa" as const,
            category_id: null,
            destination_account_id: null,
          } as ParsedTransaction
        })
        .filter((t): t is ParsedTransaction => t !== null)

      txns = filterGarbage(txns, ignoreKeywords)
    }

    if (txns.length === 0) {
      setError("Nenhuma transação encontrada. Verifique o formato do CSV.")
      setProcessingLLM(false)
      return
    }

    // Apply keyword mapping
    const withCats = txns.map((t) => {
      const mapping = transferMappings.find(
        (m) => t.description.toLowerCase().includes(m.description.toLowerCase())
      )
      if (mapping) {
        return {
          ...t,
          type: "transferencia" as const,
          category_id: null,
          destination_account_id: mapping.transfer_type === "destination" ? mapping.account_id : null,
          origin_account_id: mapping.transfer_type === "origin" ? mapping.account_id : null,
        }
      }
      return {
        ...t,
        destination_account_id: null,
        origin_account_id: null,
        category_id: applyKeywordMap(t.description, keywordMap) ?? t.category_id,
      }
    })

    // Classify uncategorized with LLM
    const catList = categories.map((c) => ({ id: c.id, name: c.name }))
    const uncategorized = withCats.filter((t) => !t.category_id && t.type !== "transferencia")
    if (uncategorized.length > 0 && catList.length > 0) {
      try {
        const llmResult = await classifyBatch(
          uncategorized.map((t) => t.description),
          catList,
        )
        for (const t of withCats) {
          if (!t.category_id && t.type !== "transferencia") {
            t.category_id = llmResult[t.description] ?? null
          }
        }
      } catch (e) {
        console.error("[CSV] LLM classification error:", e)
      }
    }

    setTransactions(withCats)
    setStep("preview")
    setProcessingLLM(false)
  }

  function updateTransaction(index: number, updates: Partial<ParsedTransaction>) {
    setTransactions((prev) => {
      const updated = prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
      const tx = updated[index]
      if (
        tx.type === "transferencia" &&
        (tx.destination_account_id || tx.origin_account_id)
      ) {
        const accountId = tx.destination_account_id || tx.origin_account_id
        if (accountId) {
          const transferType = tx.destination_account_id ? "destination" as const : "origin" as const
          saveTransferMapping(tx.description, transferType, accountId).then(() => {
            getTransferMappings().then(setTransferMappings)
          })
        }
      }
      return updated
    })
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  function validateTransfers(): string | null {
    const transfersNoAccount = transactions.filter(
      (t) => t.type === "transferencia" && !t.destination_account_id && !t.origin_account_id
    )
    if (transfersNoAccount.length > 0) {
      const descs = transfersNoAccount.slice(0, 3).map((t) => t.description).join('", "')
      return `${transfersNoAccount.length} transferência(s) sem conta: "${descs}${transfersNoAccount.length > 3 ? `" e mais ${transfersNoAccount.length - 3}` : ""}". Selecione a conta de origem ou destino para cada uma.`
    }
    return null
  }

  async function handleImport() {
    if (!accountId || transactions.length === 0) return
    const transferErr = validateTransfers()
    if (transferErr) { setError(transferErr); return }
    setImporting(true)
    setError("")
    const result = await importTransactions(accountId, transactions)
    if (result?.transferDuplicates?.length && !pendingTransferDuplicates) {
      setPendingTransferDuplicates(result.transferDuplicates)
      setError(`${result.transferDuplicates.length} transferência(s) duplicada(s) encontrada(s) entre as contas. Deseja importá-la(s) mesmo assim?`)
      setImporting(false)
      return
    }
    if (result?.duplicates?.length && !pendingDuplicates) {
      setPendingDuplicates(result.duplicates)
      const msg = result.noCategory?.length
        ? `${result.noCategory.length} pendente(s) sem categoria. ${result.duplicates.length} duplicata(s) encontrada(s). Resolva abaixo.`
        : `${result.duplicates.length} transação(ões) duplicada(s) encontrada(s). Deseja importá-la(s) mesmo assim?`
      setError(msg)
      setImporting(false)
      return
    }
    if (result?.noDestiny?.length) {
      setTransactions((prev) =>
        prev.filter((t) =>
          !result.noDestiny!.some((d: ParsedTransaction) => d.date === t.date && d.description === t.description)
        )
      )
      setError(result.error ?? `${result.imported} importada(s), ${result.noDestiny.length} transferência(s) com destino inválido removidas.`)
      setImporting(false)
      return
    }
    if (result?.noCategory?.length) {
      setTransactions(result.noCategory)
      setError(result.error ?? `${result.imported} importada(s), ${result.noCategory.length} pendente(s) sem categoria.`)
      setImporting(false)
      return
    }
    if (result?.error) {
      setError(result.error)
      setImporting(false)
      return
    }
    router.push(
      `/transactions?success=${result?.imported ?? transactions.length}+transações+importadas`
    )
  }

  async function handleForceImport() {
    setPendingDuplicates(null)
    setError("")
    setImporting(true)
    const transferErr = validateTransfers()
    if (transferErr) { setError(transferErr); setImporting(false); return }
    const result = await importTransactions(accountId, transactions, true)
    if (result?.noDestiny?.length) {
      setTransactions((prev) =>
        prev.filter((t) =>
          !result.noDestiny!.some((d: ParsedTransaction) => d.date === t.date && d.description === t.description)
        )
      )
      setError(result.error ?? `${result.imported} importada(s), ${result.noDestiny.length} transferência(s) com destino inválido removidas.`)
      setImporting(false)
      return
    }
    if (result?.noCategory?.length) {
      setTransactions(result.noCategory)
      setError(result.error ?? `${result.imported} importada(s), ${result.noCategory.length} pendente(s) sem categoria.`)
      setImporting(false)
      return
    }
    if (result?.error) {
      setError(result.error)
      setImporting(false)
      return
    }
    router.push(
      `/transactions?success=${result?.imported ?? transactions.length}+transações+importadas`
    )
  }

  function handleSkipDuplicates() {
    setPendingDuplicates(null)
    const dupKeys = new Set(pendingDuplicates?.map((d) => `${d.date}|${d.description}`) ?? [])
    setTransactions((prev) => prev.filter((t) => !dupKeys.has(`${t.date}|${t.description}`)))
  }

  function handleSkipTransferDuplicates() {
    setPendingTransferDuplicates(null)
    const dupKeys = new Set(pendingTransferDuplicates?.map((d) => `${d.date}|${d.description}`) ?? [])
    setTransactions((prev) => prev.filter((t) => !dupKeys.has(`${t.date}|${t.description}`)))
  }

  // ── Step: Upload ──────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="flex flex-col gap-4">
        <UploadZone
          inputRef={inputRef}
          parsing={parsing || extractingPDF}
          error={error}
          onFile={handleFile}
        />

        <KeywordManager onKeywordsChange={setTransferKeywords} />
        <IgnoreKeywordManager onKeywordsChange={setIgnoreKeywords} />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold">Texto do Extrato (editável)</h2>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder="Cole aqui o texto do extrato, se preferir..."
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          />
          {fileName && !parsing && !extractingPDF && (
            <p className="text-xs text-muted-foreground">Texto extraído de {fileName}</p>
          )}
          <button
            onClick={handleLLMProcess}
            disabled={processingLLM || !rawText.trim()}
            className="flex w-fit items-center gap-2 rounded-[11px] bg-accent px-5 py-2.5 text-[13.5px] font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processingLLM ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            {processingLLM ? "Processando..." : "Processar com IA"}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Preview ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-accent" />
          <div>
            <p className="text-sm font-bold">{fileName || "Texto colado"}</p>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transação
              {transactions.length !== 1 ? "ões" : ""} encontrada
              {transactions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setStep("upload")
            setRawText("")
          }}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Trocar arquivo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-muted-foreground">Importar para a conta:</span>
        <SearchSelect
          placeholder="Selecione uma conta"
          searchPlaceholder="Buscar conta..."
          value={accountId}
          onChange={setAccountId}
          className="min-w-[220px]"
          options={
            [
              { value: "", label: "Selecione uma conta" },
              ...accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (€ ${Number(a.balance).toFixed(2)})`,
                color: a.color,
              })),
            ] as SelectOption[]
          }
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-negative-soft px-4 py-2.5 text-sm text-negative">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {suggestedKeywords.length > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4 text-sm">
          <p className="mb-2.5 font-bold text-accent">
            Palavras sugeridas para ignorar
          </p>
          <p className="mb-3 text-foreground/80">
            A IA identificou palavras que aparecem em linhas de resumo/lixo.
            Adicione-as para filtrar automaticamente em futuras importações.
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedKeywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs"
              >
                {kw}
                <button
                  type="button"
                  onClick={async () => {
                    await addIgnoreKeyword(kw)
                    setIgnoreKeywords((prev) => [...prev, kw].sort())
                    setSuggestedKeywords((prev) => prev.filter((k) => k !== kw))
                  }}
                  className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-background"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSuggestedKeywords((prev) => prev.filter((k) => k !== kw))
                  }
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {pendingDuplicates && (
        <div className="rounded-2xl border border-transfer bg-transfer-soft p-4 text-sm">
          <p className="mb-2.5 font-bold text-transfer">
            {pendingDuplicates.length} transação(ões) duplicada(s) encontrada(s)
          </p>
          <p className="mb-3.5 text-foreground/80">
            Essas transações já existem na conta selecionada com a mesma data e
            descrição. O que deseja fazer?
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={handleForceImport}
              disabled={importing}
              className="rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar mesmo assim"}
            </button>
            <button
              onClick={handleSkipDuplicates}
              disabled={importing}
              className="rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Pular duplicatas
            </button>
          </div>
        </div>
      )}

      {pendingTransferDuplicates && (
        <div className="rounded-2xl border border-transfer bg-transfer-soft p-4 text-sm">
          <p className="mb-2.5 font-bold text-transfer">
            {pendingTransferDuplicates.length} transferência(s) duplicada(s) encontrada(s)
          </p>
          <p className="mb-3.5 text-foreground/80">
            Já existe(m) transferência(s) com o mesmo valor, data e contas. O que deseja fazer?
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={handleForceImport}
              disabled={importing}
              className="rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar mesmo assim"}
            </button>
            <button
              onClick={handleSkipTransferDuplicates}
              disabled={importing}
              className="rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Pular duplicatas
            </button>
          </div>
        </div>
      )}

      <ImportPreview
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        accountId={accountId}
        onUpdate={updateTransaction}
        onRemove={removeTransaction}
      />

      <div className="sticky bottom-4 z-25 flex justify-center rounded-2xl border border-border bg-surface px-6 py-3.5 shadow-card">
        <button
          onClick={handleImport}
          disabled={
            !accountId || transactions.length === 0 || importing
          }
          className="flex items-center gap-2 rounded-[11px] bg-accent px-7 py-3 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {importing
            ? "Importando..."
            : `Importar ${transactions.length} transações`}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function UploadZone({
  inputRef,
  parsing,
  error,
  onFile,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  parsing: boolean
  error: string
  onFile: (file: File) => void
}) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        e.currentTarget.classList.add("border-accent")
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("border-accent")
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.classList.remove("border-accent")
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface px-5 py-12 text-center transition-colors hover:border-accent/60"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.ofx,.qfx,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
      {parsing ? (
        <Loader2 size={32} className="animate-spin text-accent" />
      ) : (
        <>
          <Upload size={32} className="text-faint" />
          <div>
            <p className="text-sm font-semibold">
              Arraste um arquivo CSV, OFX ou PDF aqui
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              ou clique para selecionar um arquivo do seu computador
            </p>
          </div>
        </>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-negative-soft px-4 py-2 text-sm text-negative">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}

async function extractPDFTextClient(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  let text = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(" ") + "\n"
  }

  if (!text.trim()) {
    throw new Error("Não foi possível extrair texto do PDF. O PDF pode conter apenas imagens.")
  }

  return text.substring(0, 20000)
}
