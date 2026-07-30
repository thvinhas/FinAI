"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
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
import { importTransactions, parsePDFWithLLM, classifyBatch, checkDuplicates } from "@/actions/import"
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
  lastImportDates = {},
}: {
  accounts: Account[]
  categories: Category[]
  keywordMap: Record<string, string>
  initialIgnoreKeywords?: string[]
  initialTransferMappings?: TransferMapping[]
  lastImportDates?: Record<string, string | null>
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

  // Mapeamentos de transferência são específicos por conta de origem — só
  // dá pra saber qual mapeamento aplicar depois que a conta é escolhida
  // (accountId), por isso essa reclassificação roda em cima de `transactions`
  // em vez de acontecer no parse.
  const categorizedTransactions = useMemo(() => {
    if (!accountId) return transactions
    return transactions.map((t) => {
      if (t.type === "transferencia" && (t.destination_account_id || t.origin_account_id)) {
        return t
      }
      const mapping = transferMappings.find(
        (m) =>
          (m.source_account_id === null || m.source_account_id === accountId) &&
          t.description.toLowerCase().includes(m.description.toLowerCase())
      )
      if (!mapping) return t
      return {
        ...t,
        type: "transferencia" as const,
        category_id: null,
        destination_account_id: mapping.transfer_type === "destination" ? mapping.account_id : null,
        origin_account_id: mapping.transfer_type === "origin" ? mapping.account_id : null,
      }
    })
  }, [transactions, accountId, transferMappings])

  const visibleTransactions = useMemo(() => {
    if (!accountId) return categorizedTransactions
    const lastDate = lastImportDates[accountId]
    if (!lastDate) return categorizedTransactions
    const datePart = lastDate.split("T")[0]
    return categorizedTransactions.filter((t) => t.date >= datePart)
  }, [categorizedTransactions, accountId, lastImportDates])

  const hiddenCount = transactions.length - visibleTransactions.length

  const [autoDuplicateKeys, setAutoDuplicateKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (step !== "preview" || !accountId || visibleTransactions.length === 0) {
        setAutoDuplicateKeys(new Set())
        return
      }
      checkDuplicates(accountId, visibleTransactions).then((result) => {
        setAutoDuplicateKeys(new Set(result?.duplicateKeys ?? []))
      })
    }, 400)
    return () => clearTimeout(timeout)
  }, [step, accountId, visibleTransactions])

  const duplicateKeys = useMemo(() => {
    const keys = new Set(autoDuplicateKeys)
    for (const d of pendingDuplicates ?? []) keys.add(`${d.date}|${d.description}`)
    for (const d of pendingTransferDuplicates ?? []) keys.add(`${d.date}|${d.description}`)
    return keys
  }, [autoDuplicateKeys, pendingDuplicates, pendingTransferDuplicates])

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
    const withCats = txns.map((t) => ({
      ...t,
      destination_account_id: t.type !== "transferencia" ? null : t.destination_account_id ?? null,
      origin_account_id: t.type !== "transferencia" ? null : t.origin_account_id ?? null,
      category_id: t.type === "transferencia" ? null : (applyKeywordMap(t.description, keywordMap) ?? t.category_id),
    }))
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
    const withCats = txns.map((t) => ({
      ...t,
      destination_account_id: null,
      origin_account_id: null,
      category_id: applyKeywordMap(t.description, keywordMap) ?? t.category_id,
    }))

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

  function updateTransaction(visibleIndex: number, updates: Partial<ParsedTransaction>) {
    const visibleTx = visibleTransactions[visibleIndex]
    if (!visibleTx) return
    setTransactions((prev) => {
      const rawIndex = prev.findIndex(
        (t) => t.date === visibleTx.date && t.description === visibleTx.description && t.amount === visibleTx.amount
      )
      if (rawIndex === -1) return prev
      const updated = prev.map((t, i) => (i === rawIndex ? { ...t, ...updates } : t))
      const tx = updated[rawIndex]
      if (
        tx.type === "transferencia" &&
        (tx.destination_account_id || tx.origin_account_id)
      ) {
        const targetAccountId = tx.destination_account_id || tx.origin_account_id
        if (targetAccountId) {
          const transferType = tx.destination_account_id ? "destination" as const : "origin" as const
          saveTransferMapping(tx.description, transferType, targetAccountId, accountId || null).then(() => {
            getTransferMappings().then(setTransferMappings)
          })
        }
      }
      return updated
    })
  }

  function removeTransaction(visibleIndex: number) {
    const visibleTx = visibleTransactions[visibleIndex]
    if (!visibleTx) return
    setTransactions((prev) =>
      prev.filter(
        (t) =>
          !(t.date === visibleTx.date && t.description === visibleTx.description && t.amount === visibleTx.amount)
      )
    )
  }

  function validateTransfers(): string | null {
    const transfersNoAccount = visibleTransactions.filter(
      (t) => t.type === "transferencia" && !t.destination_account_id && !t.origin_account_id
    )
    if (transfersNoAccount.length > 0) {
      const descs = transfersNoAccount.slice(0, 3).map((t) => t.description).join('", "')
      return `${transfersNoAccount.length} transferência(s) sem conta: "${descs}${transfersNoAccount.length > 3 ? `" e mais ${transfersNoAccount.length - 3}` : ""}". Selecione a conta de origem ou destino para cada uma.`
    }
    return null
  }

  async function handleImport() {
    if (!accountId || visibleTransactions.length === 0) return
    const transferErr = validateTransfers()
    if (transferErr) { setError(transferErr); return }
    setImporting(true)
    setError("")
    const result = await importTransactions(accountId, visibleTransactions)
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
      `/transactions?success=${result?.imported ?? visibleTransactions.length}+transações+importadas`
    )
  }

  async function handleForceImport() {
    setPendingDuplicates(null)
    setError("")
    setImporting(true)
    const transferErr = validateTransfers()
    if (transferErr) { setError(transferErr); setImporting(false); return }
    const result = await importTransactions(accountId, visibleTransactions, true)
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
      <div className="space-y-6">
        <KeywordManager onKeywordsChange={setTransferKeywords} />
        <IgnoreKeywordManager onKeywordsChange={setIgnoreKeywords} />
        <UploadZone
          inputRef={inputRef}
          parsing={parsing || extractingPDF}
          error={error}
          onFile={handleFile}
        />

        {rawText && !parsing && !extractingPDF && (
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-medium text-white">
              Texto extraído — {fileName}
            </h3>
            <p className="text-xs text-zinc-500">
              Revise o texto extraído do arquivo e clique em "Processar com IA"
              para extrair as transações.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleLLMProcess}
              disabled={processingLLM || !rawText.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processingLLM ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              {processingLLM ? "Processando..." : "Processar com IA"}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Step: Preview ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-white">{fileName}</p>
            <p className="text-xs text-zinc-500">
              {visibleTransactions.length} transação
              {visibleTransactions.length !== 1 ? "ões" : ""} encontrada
              {visibleTransactions.length !== 1 ? "s" : ""}
              {hiddenCount > 0 && (
                <span className="ml-1 text-zinc-600">
                  ({hiddenCount} anteriores ao último import ignoradas)
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setStep("upload")
            setRawText("")
          }}
          className="text-sm text-zinc-500 hover:text-white"
        >
          Trocar arquivo
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">
          Conta de destino
        </label>
        <SearchSelect
          placeholder="Selecione uma conta"
          searchPlaceholder="Buscar conta..."
          value={accountId}
          onChange={setAccountId}
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
        <div className="flex items-center gap-2 rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {suggestedKeywords.length > 0 && (
        <div className="rounded-xl border border-indigo-800 bg-indigo-900/20 p-4 text-sm">
          <p className="mb-3 font-medium text-indigo-300">
            Palavras sugeridas para ignorar
          </p>
          <p className="mb-3 text-indigo-200/70">
            A IA identificou palavras que aparecem em linhas de resumo/lixo.
            Adicione-as para filtrar automaticamente em futuras importações.
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedKeywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-2 rounded-full bg-indigo-900/50 px-3 py-1.5 text-xs text-indigo-200"
              >
                {kw}
                <button
                  type="button"
                  onClick={async () => {
                    await addIgnoreKeyword(kw)
                    setIgnoreKeywords((prev) => [...prev, kw].sort())
                    setSuggestedKeywords((prev) => prev.filter((k) => k !== kw))
                  }}
                  className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-500 transition-colors"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSuggestedKeywords((prev) => prev.filter((k) => k !== kw))
                  }
                  className="text-indigo-400 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {!pendingDuplicates && !pendingTransferDuplicates && autoDuplicateKeys.size > 0 && (
        <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-sm">
          <p className="font-medium text-red-400">
            {autoDuplicateKeys.size} transação(ões) marcada(s) como possível duplicata
          </p>
          <p className="mt-1 text-red-300/70">
            Já existe uma transação com a mesma data e descrição (ou transferência com
            mesmo valor/data/contas). Veja a tag &quot;Duplicada&quot; nas linhas destacadas abaixo.
            Ao clicar em Importar, você poderá optar por pular ou importar mesmo assim.
          </p>
        </div>
      )}

      {pendingDuplicates && (
        <div className="rounded-xl border border-amber-800 bg-amber-900/30 p-4 text-sm">
          <p className="mb-3 font-medium text-amber-300">
            {pendingDuplicates.length} transação(ões) duplicada(s) encontrada(s)
          </p>
          <p className="mb-4 text-amber-200/70">
            Essas transações já existem na conta selecionada com a mesma data e
            descrição — estão destacadas com a tag &quot;Duplicada&quot; na lista abaixo.
            O que deseja fazer?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleForceImport}
              disabled={importing}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar mesmo assim"}
            </button>
            <button
              onClick={handleSkipDuplicates}
              disabled={importing}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
            >
              Pular duplicatas
            </button>
          </div>
        </div>
      )}

      {pendingTransferDuplicates && (
        <div className="rounded-xl border border-yellow-700 bg-yellow-900/30 p-4 text-sm">
          <p className="mb-3 font-medium text-yellow-300">
            {pendingTransferDuplicates.length} transferência(s) duplicada(s) encontrada(s)
          </p>
          <p className="mb-4 text-yellow-200/70">
            Já existe(m) transferência(s) com o mesmo valor, data e contas — estão
            destacadas com a tag &quot;Duplicada&quot; na lista abaixo. O que deseja fazer?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleForceImport}
              disabled={importing}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar mesmo assim"}
            </button>
            <button
              onClick={handleSkipTransferDuplicates}
              disabled={importing}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
            >
              Pular duplicatas
            </button>
          </div>
        </div>
      )}

      <ImportPreview
        transactions={visibleTransactions}
        categories={categories}
        accounts={accounts}
        accountId={accountId}
        onUpdate={updateTransaction}
        onRemove={removeTransaction}
        duplicateKeys={duplicateKeys}
      />

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <p className="text-sm text-zinc-400">
            {visibleTransactions.length} transação
            {visibleTransactions.length !== 1 ? "ões" : ""}
            {hiddenCount > 0 && (
              <span className="ml-2 text-xs text-zinc-600">
                ({hiddenCount} ocultadas)
              </span>
            )}
            {accountId &&
              ` → ${accounts.find((a) => a.id === accountId)?.name ?? ""}`}
          </p>
          {!accountId && (
            <p className="text-xs text-zinc-600">
              Selecione uma conta para importar
            </p>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={
            !accountId || visibleTransactions.length === 0 || importing
          }
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {importing
            ? "Importando..."
            : `Importar ${visibleTransactions.length}`}
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
        e.currentTarget.classList.add("border-indigo-500")
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("border-indigo-500")
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.classList.remove("border-indigo-500")
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-16 transition-colors hover:border-zinc-500"
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
        <Loader2 size={40} className="animate-spin text-indigo-400" />
      ) : (
        <>
          <Upload size={40} className="text-zinc-500" />
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-300">
              Solte o arquivo aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Suporta CSV, OFX, QFX e PDF
            </p>
          </div>
        </>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300">
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


