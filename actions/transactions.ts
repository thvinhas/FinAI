"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Transaction } from "@/types/database";

export async function getTransactions(filters?: {
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*, categories(*), accounts!transactions_account_id_fkey(*), destination_account:accounts!transactions_destination_account_id_fkey(*)")
    .order("date", { ascending: false })
    .limit(500);

  if (filters?.accountId) {
    query = query.or(
      `account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`
    );
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTransactions error:", error);
    return { transactions: [], receitas: 0, despesas: 0, saldo: 0 };
  }

  const transactions = (data ?? []) as Transaction[];
  const totalReceitas = transactions
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalDespesas = transactions
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    transactions,
    receitas: totalReceitas,
    despesas: totalDespesas,
    saldo: totalReceitas - totalDespesas,
  };
}

export async function createTransfer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const fromId = formData.get("from_account_id") as string;
  const toId = formData.get("to_account_id") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (fromId === toId) return { error: "Selecione contas diferentes" };

  const { data: fromAcc } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", fromId)
    .single();

  if (!fromAcc || Number(fromAcc.balance) < amount) {
    return { error: "Saldo insuficiente" };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: fromId,
    destination_account_id: toId,
    amount,
    type: "transferencia",
    description: "Transferência",
    date: formData.get("date"),
  });

  if (error) return { error: error.message };

  await supabase
    .from("accounts")
    .update({ balance: Number(fromAcc.balance) - amount })
    .eq("id", fromId);

  const { data: toAcc } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", toId)
    .single();

  if (toAcc) {
    await supabase
      .from("accounts")
      .update({ balance: Number(toAcc.balance) + amount })
      .eq("id", toId);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const accountId = formData.get("account_id") as string;
  const categoryId = formData.get("category_id") as string;

  if ((type === "receita" || type === "despesa") && !categoryId) {
    return { error: "Categoria é obrigatória para receitas e despesas" };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId || null,
    category_id: formData.get("category_id") || null,
    amount,
    type,
    description: formData.get("description"),
    date: formData.get("date"),
  });

  if (!error && accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    if (account) {
      const delta = type === "receita" ? amount : -amount;
      await supabase
        .from("accounts")
        .update({ balance: Number(account.balance) + delta })
        .eq("id", accountId);
    }
  }

  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(*), accounts!transactions_account_id_fkey(*), destination_account:accounts!transactions_destination_account_id_fkey(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Transaction;
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(formData.get("amount") as string);
  const accountId = formData.get("account_id") as string;
  const type = formData.get("type") as string;
  const categoryId = formData.get("category_id") as string;

  if ((type === "receita" || type === "despesa") && !categoryId) {
    return { error: "Categoria é obrigatória para receitas e despesas" };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      amount,
      type,
      account_id: accountId || null,
      category_id: formData.get("category_id") || null,
      description: formData.get("description"),
      date: formData.get("date"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, account_id, destination_account_id, amount, type")
    .eq("id", id)
    .single();

  if (tx) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (tx.type === "transferencia") {
      const { data: fromAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", tx.account_id)
        .single();
      if (fromAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(fromAcc.balance) + Number(tx.amount) })
          .eq("id", tx.account_id);
      }
      const { data: toAcc } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", tx.destination_account_id)
        .single();
      if (toAcc) {
        await supabase
          .from("accounts")
          .update({ balance: Number(toAcc.balance) - Number(tx.amount) })
          .eq("id", tx.destination_account_id);
      }
    } else if (tx.account_id) {
      const { data: account } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", tx.account_id)
        .single();

      if (account) {
        const delta = tx.type === "receita" ? -Number(tx.amount) : Number(tx.amount);
        await supabase
          .from("accounts")
          .update({ balance: Number(account.balance) + delta })
          .eq("id", tx.account_id);
      }
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function getDashboardData(year: number, month: number) {
  const supabase = await createClient();
  const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
  const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];
  const dayAfterMonth = new Date(year, month + 1, 1).toISOString().split("T")[0];

  const prevMonthDate = new Date(year, month - 1, 1);
  const prevFirstDay = prevMonthDate.toISOString().split("T")[0];
  const prevLastDay = new Date(year, month, 0).toISOString().split("T")[0];

  const [
    { data: monthTransactions },
    { data: allTransactions },
    { data: accounts },
    { data: posMonth },
    { data: prevMonthTransactions },
    { count: prevMonthCount },
  ] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*, categories(*)")
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false }),
      supabase
        .from("transactions")
        .select("amount, type, date, accounts(name)")
        .order("date", { ascending: false })
        .limit(10),
      supabase
        .from("accounts")
        .select("id, name, balance, color, type"),
      supabase
        .from("transactions")
        .select("amount, type")
        .gte("date", dayAfterMonth),
      supabase
        .from("transactions")
        .select("amount, type")
        .gte("date", prevFirstDay)
        .lte("date", prevLastDay),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .lt("date", firstDay),
    ]);

  const entries = monthTransactions ?? [];

  const receitas = entries
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + Number(t.amount), 0);
  const despesas = entries
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + Number(t.amount), 0);

  const byCategory: Record<string, { name: string; color: string; value: number }> = {};
  for (const t of entries.filter((t) => t.type === "despesa")) {
    const cat = t.categories;
    if (cat) {
      if (!byCategory[cat.id]) {
        byCategory[cat.id] = { name: cat.name, color: cat.color, value: 0 };
      }
      byCategory[cat.id].value += Number(t.amount);
    }
  }

  const byCategoryReceita: Record<string, { name: string; color: string; value: number }> = {};
  for (const t of entries.filter((t) => t.type === "receita")) {
    const cat = t.categories;
    if (cat) {
      if (!byCategoryReceita[cat.id]) {
        byCategoryReceita[cat.id] = { name: cat.name, color: cat.color, value: 0 };
      }
      byCategoryReceita[cat.id].value += Number(t.amount);
    }
  }

  const deltaPos = (posMonth ?? []).reduce((acc, t) => {
    if (t.type === "receita") return acc + Number(t.amount);
    if (t.type === "despesa") return acc - Number(t.amount);
    return acc;
  }, 0);

  const saldoAtual =
    accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0;
  const saldoTotal = saldoAtual - deltaPos;

  const economiaValue = receitas - despesas;
  const economiaPct = receitas > 0 ? (economiaValue / receitas) * 100 : 0;

  const monthLabel = new Date(year, month).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const hasPreviousData = (prevMonthCount ?? 0) > 0;
  const prevReceitas = (prevMonthTransactions ?? [])
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + Number(t.amount), 0);
  const prevDespesas = (prevMonthTransactions ?? [])
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + Number(t.amount), 0);
  const prevSaldoTotal = saldoTotal - economiaValue;

  return {
    saldo: economiaValue,
    saldoTotal,
    receitas,
    despesas,
    recentes: allTransactions ?? [],
    byCategory: Object.values(byCategory),
    byCategoryReceita: Object.values(byCategoryReceita),
    accounts: accounts ?? [],
    previousMonth: hasPreviousData
      ? { receitas: prevReceitas, despesas: prevDespesas, saldoTotal: prevSaldoTotal }
      : null,
    monthlyData: { receita: receitas, despesa: despesas, saldo: economiaValue, label: monthLabel },
    economia: { value: economiaValue, pct: economiaPct },
  };
}

const MONTHLY_HISTORY_WINDOW = 24;

export async function getMonthlyHistory(year: number, month: number) {
  const supabase = await createClient();
  const windowStart = new Date(year, month - MONTHLY_HISTORY_WINDOW + 1, 1);
  const rangeStart = windowStart.toISOString().split("T")[0];
  const rangeEnd = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const { data } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .in("type", ["receita", "despesa"])
    .gte("date", rangeStart)
    .lte("date", rangeEnd);

  const byMonth = new Map<string, { receita: number; despesa: number }>();
  for (let i = 0; i < MONTHLY_HISTORY_WINDOW; i++) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
    byMonth.set(`${d.getFullYear()}-${d.getMonth()}`, { receita: 0, despesa: 0 });
  }

  for (const t of data ?? []) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    if (t.type === "receita") bucket.receita += Number(t.amount);
    else bucket.despesa += Number(t.amount);
  }

  return Array.from(byMonth.entries()).map(([key, totals]) => {
    const [y, m] = key.split("-").map(Number);
    const label = new Date(y, m).toLocaleDateString("pt-BR", { month: "short" });
    return { label: label.replace(".", ""), receita: totals.receita, despesa: totals.despesa };
  });
}

export async function suggestCategory(
  description: string
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !description.trim()) return null;

  const { data } = await supabase
    .from("transactions")
    .select("category_id")
    .ilike("description", `%${description}%`)
    .not("category_id", "is", null)
    .limit(20);

  if (!data || data.length === 0) return null;

  const freq: Record<string, number> = {};
  for (const t of data) {
    freq[t.category_id] = (freq[t.category_id] || 0) + 1;
  }

  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, count] of Object.entries(freq)) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }

  return bestId;
}
