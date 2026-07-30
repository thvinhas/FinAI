"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ParsedTransaction } from "@/types/import"
import { extractFromPDFText, classifyBatchWithLLM } from "@/app/import/llm"

export async function importTransactions(
  accountId: string,
  transactions: ParsedTransaction[],
  force = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }
  if (!accountId) return { error: "Selecione uma conta" }
  if (transactions.length === 0) return { error: "Nenhuma transação para importar" }

  const { data: account } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", accountId)
    .single()

  if (!account) return { error: "Conta não encontrada" }

  const transfers = transactions.filter((t) => t.type === "transferencia")
  const allRegular = transactions.filter((t) => t.type !== "transferencia")

  // Transações sem categoria ficam de fora deste lote — se fossem inseridas
  // com category_id null e reportadas como "noCategory", o cliente as
  // mantinha na tela como se ainda não tivessem sido importadas, e um novo
  // clique em Importar as reenviava, gerando duplicata (elas já estariam no
  // banco da primeira vez).
  const noCategory = allRegular.filter((t) => !t.category_id)
  const regular = allRegular.filter((t) => t.category_id)

  const validatesTransfers: ParsedTransaction[] = []
  const invalidTransfers: ParsedTransaction[] = []
  for (const t of transfers) {
    const otherAccountId = t.destination_account_id || t.origin_account_id
    if (otherAccountId) {
      const { data: otherAcc } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", otherAccountId)
        .single()
      if (otherAcc) {
        validatesTransfers.push(t)
      } else {
        invalidTransfers.push(t)
      }
    } else {
      invalidTransfers.push(t)
    }
  }

  const transferDuplicates: ParsedTransaction[] = []
  const transferDupKeys = new Set<string>()
  if (!force) {
    for (const t of validatesTransfers) {
      const otherId = t.destination_account_id || t.origin_account_id
      if (!otherId) continue

      const { data: existingTxn } = await supabase
        .from("transactions")
        .select("id")
        .eq("type", "transferencia")
        .eq("amount", t.amount)
        .eq("date", t.date)
        .or(
          `and(account_id.eq.${accountId},destination_account_id.eq.${otherId}),` +
          `and(account_id.eq.${otherId},destination_account_id.eq.${accountId}),` +
          `and(account_id.eq.${accountId},origin_account_id.eq.${otherId}),` +
          `and(account_id.eq.${otherId},origin_account_id.eq.${accountId})`
        )
        .maybeSingle()

      if (existingTxn) {
        transferDuplicates.push(t)
        transferDupKeys.add(`${t.amount}|${t.date}|${otherId}`)
      }
    }
  }

  if (regular.length === 0 && validatesTransfers.length === 0) {
    return {
      error: "Nenhuma transação válida para importar.",
      noCategory,
      duplicates: [],
      noDestiny: invalidTransfers,
      transferDuplicates,
    }
  }

  const allDescs = [...regular, ...validatesTransfers].map((t) => t.description)
  const { data: existing } = await supabase
    .from("transactions")
    .select("description, date")
    .eq("account_id", accountId)
    .in("description", allDescs)

  const existingSet = new Set(
    (existing ?? []).map((t) => `${t.description}|${t.date}`)
  )

  const toImportRegular = force
    ? regular
    : regular.filter((t) => !existingSet.has(`${t.description}|${t.date}`))

  const toImportTransfers = force
    ? validatesTransfers
    : validatesTransfers.filter((t) => {
        const otherId = t.destination_account_id || t.origin_account_id
        const isTransferDup = otherId && transferDupKeys.has(`${t.amount}|${t.date}|${otherId}`)
        return !isTransferDup && !existingSet.has(`${t.description}|${t.date}`)
      })

  const allDuplicates = [
    ...regular.filter((t) => existingSet.has(`${t.description}|${t.date}`)),
    ...validatesTransfers.filter((t) => {
      const otherId = t.destination_account_id || t.origin_account_id
      const isTxnDup = existingSet.has(`${t.description}|${t.date}`)
      const isTransferDup = otherId && transferDupKeys.has(`${t.amount}|${t.date}|${otherId}`)
      return isTxnDup || isTransferDup
    }),
  ]

  if (toImportRegular.length === 0 && toImportTransfers.length === 0) {
    return {
      error: "Todas as transações já estão cadastradas.",
      noCategory,
      duplicates: allDuplicates,
      noDestiny: invalidTransfers,
      transferDuplicates,
    }
  }

  const regularDelta = toImportRegular.reduce(
    (acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount),
    0
  )

  const allToImport = [
    ...toImportRegular.map((t) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: t.category_id,
      amount: t.amount,
      type: t.type as string,
      description: t.description,
      date: t.date,
    })),
    ...toImportTransfers.map((t) => ({
      user_id: user.id,
      account_id: t.origin_account_id || accountId,
      destination_account_id: t.destination_account_id || null,
      amount: t.amount,
      type: "transferencia",
      description: t.description,
      date: t.date,
    })),
  ]

  const { error } = await supabase.from("transactions").insert(allToImport)

  if (error) return { error: error.message, noCategory, duplicates: allDuplicates, noDestiny: invalidTransfers, transferDuplicates }

  // Só grava o log (que avança o corte "esconder anteriores ao último
  // import") quando não sobra pendência sem categoria — senão, ao recarregar
  // a tela, as transações ainda não importadas (mas com data anterior a
  // hoje) ficariam escondidas pelo próprio corte, sem chance de importar.
  if (noCategory.length === 0) {
    await supabase.from("import_logs").insert({
      user_id: user.id,
      account_id: accountId,
      transaction_count: allToImport.length,
    })
  }

  if (regularDelta !== 0) {
    await supabase
      .from("accounts")
      .update({ balance: Number(account.balance) + regularDelta })
      .eq("id", accountId)
  }

  for (const t of toImportTransfers) {
    if (t.destination_account_id) {
      // Outgoing transfer: debit current, credit destination
      const { data: srcAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single()
      if (srcAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(srcAcc.balance) - t.amount })
          .eq("id", accountId)
      }
      const { data: dstAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", t.destination_account_id)
        .single()
      if (dstAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(dstAcc.balance) + t.amount })
          .eq("id", t.destination_account_id)
      }
    } else if (t.origin_account_id) {
      // Incoming transfer: debit origin, credit current
      const { data: srcAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", t.origin_account_id)
        .single()
      if (srcAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(srcAcc.balance) - t.amount })
          .eq("id", t.origin_account_id)
      }
      const { data: dstAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", accountId)
        .single()
      if (dstAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(dstAcc.balance) + t.amount })
          .eq("id", accountId)
      }
    }
  }

  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/accounts")

  if (noCategory.length > 0 || allDuplicates.length > 0 || invalidTransfers.length > 0) {
    return { imported: toImportRegular.length + toImportTransfers.length, noCategory, duplicates: allDuplicates, noDestiny: invalidTransfers, transferDuplicates }
  }
}

export async function checkDuplicates(
  accountId: string,
  transactions: ParsedTransaction[]
) {
  if (!accountId || transactions.length === 0) return { duplicateKeys: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { duplicateKeys: [] }

  const regular = transactions.filter((t) => t.type !== "transferencia")
  const transfers = transactions.filter(
    (t) => t.type === "transferencia" && (t.destination_account_id || t.origin_account_id)
  )

  const duplicateKeys = new Set<string>()

  const allDescs = [...regular, ...transfers].map((t) => t.description)
  if (allDescs.length > 0) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("description, date")
      .eq("account_id", accountId)
      .in("description", allDescs)

    const existingSet = new Set(
      (existing ?? []).map((t) => `${t.description}|${t.date}`)
    )

    for (const t of [...regular, ...transfers]) {
      if (existingSet.has(`${t.description}|${t.date}`)) {
        duplicateKeys.add(`${t.date}|${t.description}`)
      }
    }
  }

  for (const t of transfers) {
    const otherId = t.destination_account_id || t.origin_account_id
    if (!otherId) continue

    const { data: existingTxn } = await supabase
      .from("transactions")
      .select("id")
      .eq("type", "transferencia")
      .eq("amount", t.amount)
      .eq("date", t.date)
      .or(
        `and(account_id.eq.${accountId},destination_account_id.eq.${otherId}),` +
        `and(account_id.eq.${otherId},destination_account_id.eq.${accountId}),` +
        `and(account_id.eq.${accountId},origin_account_id.eq.${otherId}),` +
        `and(account_id.eq.${otherId},origin_account_id.eq.${accountId})`
      )
      .maybeSingle()

    if (existingTxn) {
      duplicateKeys.add(`${t.date}|${t.description}`)
    }
  }

  return { duplicateKeys: Array.from(duplicateKeys) }
}

export async function parsePDFWithLLM(
  text: string,
  categories: { id: string; name: string }[] = [],
  ignoreKeywords: string[] = []
) {
  if (!text.trim()) return { error: "Texto vazio" }
  if (text.length > 50000) {
    return { error: `Texto muito longo (${text.length} caracteres). O máximo suportado é 50.000 caracteres. Tente enviar um PDF com menos páginas.` }
  }
  console.log("[parsePDFWithLLM] Text length:", text.length)
  const result = await extractFromPDFText(text, categories)
  console.log("[parsePDFWithLLM] Result:", JSON.stringify(result, null, 2))
  if (result.error) return { error: result.error }
  return { transactions: result.transactions, suggested_ignore_keywords: result.suggested_ignore_keywords }
}

export async function classifyBatch(
  descriptions: string[],
  categories: { id: string; name: string }[],
): Promise<Record<string, string | null>> {
  return classifyBatchWithLLM(descriptions, categories)
}
