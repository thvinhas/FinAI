"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Transaction } from "@/types/database";

export async function getTransactions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(*), accounts!transactions_account_id_fkey(*), destination_account:accounts!transactions_destination_account_id_fkey(*)")
    .order("date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getTransactions error:", error);
    return [];
  }

  return (data ?? []) as Transaction[];
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

export async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data: monthTransactions, error: monthError } = await supabase
    .from("transactions")
    .select("*, categories(*), accounts!transactions_account_id_fkey(*)")
    .gte("date", firstDay);

  if (monthError) {
    console.error("getDashboardData month error:", monthError);
  }

  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("amount, type, date, accounts(name)")
    .order("date", { ascending: false })
    .limit(10);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance, color, type");

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

  const saldoTotal =
    accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  return {
    saldo: receitas - despesas,
    saldoTotal,
    receitas,
    despesas,
    recentes: allTransactions ?? [],
    byCategory: Object.values(byCategory),
    accounts: accounts ?? [],
  };
}
