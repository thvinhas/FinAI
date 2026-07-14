import { Context } from "grammy"
import { createAdminClient } from "../supabase/admin"
import type { Account, Category } from "@/types/database"
import { extractFromPhoto } from "./receipt"
import { classifyWithLLM } from "@/app/(app)/import/llm"

function getSupabase() {
  return createAdminClient()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

function parseTextMessage(
  text: string,
): { amount: number; description: string } | null {
  const amountMatch = text.match(/([\d,.]+)/)
  if (!amountMatch) return null

  const amount = parseFloat(amountMatch[1].replace(",", "."))
  if (isNaN(amount) || amount <= 0) return null

  const description = text.replace(amountMatch[1], "").trim()
  if (!description) return null

  return { amount, description }
}

export async function handleStart(ctx: Context) {
  await ctx.reply(
    "🤖 *FinApp Bot*\n\n" +
      "Para vincular sua conta do FinApp:\n" +
      "1. Acesse *Configurações* no app\n" +
      "2. Copie seu token de vinculação\n" +
      "3. Envie `/link SEU_TOKEN`\n\n" +
      "Comandos disponíveis:\n" +
      "`/link TOKEN` — Vincular conta\n" +
      "`/contas` — Listar contas\n\n" +
      "Envie uma *foto de recibo* ou *texto* com valor + descrição para registrar.",
    { parse_mode: "Markdown" },
  )
}

export async function handleLink(ctx: Context) {
  const token = ctx.match
  if (!token) {
    return ctx.reply("Use: `/link SEU_TOKEN`", { parse_mode: "Markdown" })
  }

  const supabase = getSupabase()
  const chatId = ctx.chat?.id
  if (!chatId) return

  const { data: link } = await supabase
    .from("telegram_links")
    .select("*")
    .eq("token", token)
    .single()

  if (!link) {
    return ctx.reply(
      "Token inválido. Gere um novo em Configurações no app.",
    )
  }

  if (link.chat_id) {
    return ctx.reply("Este token já foi utilizado.")
  }

  const { error } = await supabase
    .from("telegram_links")
    .update({ chat_id: chatId })
    .eq("id", link.id)

  if (error) {
    return ctx.reply("Erro ao vincular. Tente novamente.")
  }

  await ctx.reply(
    "Conta vinculada com sucesso! ✅\n\n" +
      "Agora você pode enviar fotos de recibos ou texto " +
      "(ex: `35,50 ifood`) para registrar despesas.",
    { parse_mode: "Markdown" },
  )
}

export async function handleContas(ctx: Context) {
  const supabase = getSupabase()
  const chatId = ctx.chat?.id
  if (!chatId) return

  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .single()

  if (!link) {
    return ctx.reply("Conta não vinculada. Use `/link TOKEN` primeiro.", {
      parse_mode: "Markdown",
    })
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", link.user_id)
    .is("archived_at", null)
    .order("name")

  if (!accounts || accounts.length === 0) {
    return ctx.reply("Nenhuma conta cadastrada.")
  }

  const lines = accounts.map(
    (a: Account) => `• *${a.name}*: € ${Number(a.balance).toFixed(2)}`,
  )
  await ctx.reply("📊 *Suas contas:*\n\n" + lines.join("\n"), {
    parse_mode: "Markdown",
  })
}

export async function handleMessage(ctx: Context, type: "text" | "photo") {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const supabase = getSupabase()
  const { data: link, error: linkError } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .single()

  if (linkError || !link) {
    return ctx.reply("Conta não vinculada. Use `/link TOKEN` primeiro.", {
      parse_mode: "Markdown",
    })
  }

  let amount: number
  let description: string
  let date: string

  if (type === "text") {
    const text = ctx.message?.text ?? ""
    const parsed = parseTextMessage(text)
    if (!parsed) {
      return ctx.reply(
        "Envie no formato: `35,50 descricao` ou `descricao 35,50`",
        { parse_mode: "Markdown" },
      )
    }
    amount = parsed.amount
    description = parsed.description
    date = new Date().toISOString().split("T")[0]
  } else {
    const photo = ctx.message?.photo
    if (!photo || photo.length === 0) return

    const fileId = photo[photo.length - 1].file_id
    const file = await ctx.api.getFile(fileId)
    if (!file.file_path) {
      return ctx.reply("Não foi possível ler a foto. Tente novamente.")
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

    await ctx.reply("📷 Processando recibo...")

    const extracted = await extractFromPhoto(fileUrl)
    if (!extracted) {
      return ctx.reply(
        "Não consegui extrair os dados da foto. " +
          "Tente enviar o valor manualmente:\n" +
          "`35,50 descricao`",
        { parse_mode: "Markdown" },
      )
    }
    amount = extracted.amount
    description = extracted.description
    date = extracted.date ?? new Date().toISOString().split("T")[0]
  }

  await supabase.from("telegram_conversations").upsert(
    {
      user_id: link.user_id,
      chat_id: chatId,
      step: "select_account",
      data: { amount, description, date },
    },
    { onConflict: "chat_id", ignoreDuplicates: false },
  )

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", link.user_id)
    .is("archived_at", null)
    .order("name")

  if (!accounts || accounts.length === 0) {
    return ctx.reply("Nenhuma conta cadastrada. Crie uma conta no app primeiro.")
  }

  await ctx.reply(
    `📝 *${description}* — € ${amount.toFixed(2)}\n📅 ${formatDate(date)}\n\nSelecione a conta:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: accounts.map((a: { id: string; name: string }) => [
          { text: a.name, callback_data: `select_account:${a.id}` },
        ]),
      },
    },
  )
}

export async function handleCallback(ctx: Context) {
  if (!ctx.callbackQuery?.data || !ctx.chat?.id) return
  const chatId = ctx.chat.id
  const supabase = getSupabase()

  const { data: conv } = await supabase
    .from("telegram_conversations")
    .select("*")
    .eq("chat_id", chatId)
    .single()

  if (!conv) {
    return ctx.answerCallbackQuery("Conversa expirada. Envie uma nova mensagem.")
  }

  const data = conv.data as Record<string, unknown>

  if (ctx.callbackQuery.data.startsWith("select_account:")) {
    const accountId = ctx.callbackQuery.data.split(":")[1]

    const [accountResult, categoriesResult] = await Promise.all([
      supabase.from("accounts").select("name").eq("id", accountId).single(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", conv.user_id)
        .is("archived_at", null),
    ])

    const account = accountResult.data
    const categories = (categoriesResult.data ?? []) as { id: string; name: string }[]

    let categoryId: string | null = null
    let categoryName: string | null = null

    if (categories.length > 0) {
      const description = (data.description ?? "") as string
      try {
        const cat = await classifyWithLLM(description, categories)
        if (cat) {
          categoryId = cat
          categoryName = categories.find((c) => c.id === cat)?.name ?? null
        }
      } catch {
        // LLM falhou, segue sem categoria
      }
    }

    await supabase
      .from("telegram_conversations")
      .update({
        step: "confirm",
        data: { ...data, account_id: accountId, category_id: categoryId, category_name: categoryName },
      })
      .eq("id", conv.id)

    const categoryLine = categoryName ? `\n📂 *Categoria:* ${categoryName}` : ""

    await ctx.editMessageText(
      `📝 *${data.description}*\n💰 € ${Number(data.amount).toFixed(2)}\n📅 ${formatDate(data.date as string)}\n🏦 Conta: ${account?.name ?? "—"}${categoryLine}\n\nConfirmar?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Confirmar", callback_data: "confirm:yes" },
              { text: "❌ Cancelar", callback_data: "cancel" },
            ],
          ],
        },
      },
    )
    await ctx.answerCallbackQuery()
  } else if (ctx.callbackQuery.data === "confirm:yes") {
    const { error } = await supabase.from("transactions").insert({
      user_id: conv.user_id,
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      amount: data.amount,
      type: "despesa",
      description: data.description,
      date: data.date,
    })

    if (error) {
      await ctx.editMessageText("Erro ao criar transação. Tente novamente.")
    } else {
      const dateStr = data.date as string
      const monthStart = dateStr.substring(0, 7) + "-01"

      const [{ data: accountResult }, { data: monthCatTx }] = await Promise.all([
        supabase.from("accounts").select("name, balance").eq("id", data.account_id).single(),
        data.category_id
          ? supabase
              .from("transactions")
              .select("amount")
              .eq("user_id", conv.user_id)
              .eq("category_id", data.category_id)
              .eq("type", "despesa")
              .gte("date", monthStart)
              .lte("date", dateStr)
          : Promise.resolve({ data: null }),
      ])

      const oldBalance = Number(accountResult?.balance ?? 0)
      const newBalance = oldBalance - Number(data.amount)

      await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", data.account_id)

      const balanceLine = accountResult
        ? `\n🏦 *${accountResult.name}:* € ${newBalance.toFixed(2)}`
        : ""

      let catSpendLine = ""
      if (data.category_name && monthCatTx) {
        const totalCat = (monthCatTx as { amount: number }[]).reduce(
          (s, t) => s + Number(t.amount),
          Number(data.amount),
        )
        catSpendLine = `\n📂 *${data.category_name}* este mês: € ${totalCat.toFixed(2)}`
      }

      await ctx.editMessageText(
        `✅ *${data.description}* — € ${Number(data.amount).toFixed(2)}${balanceLine}${catSpendLine}`,
        { parse_mode: "Markdown" },
      )
    }

    await supabase.from("telegram_conversations").delete().eq("id", conv.id)
    await ctx.answerCallbackQuery()
  } else if (ctx.callbackQuery.data === "cancel") {
    await ctx.editMessageText("❌ Operação cancelada.")
    await supabase.from("telegram_conversations").delete().eq("id", conv.id)
    await ctx.answerCallbackQuery()
  }
}
