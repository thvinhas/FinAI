"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseCurrency } from "@/lib/format";
import type { Account } from "@/types/database";

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

export async function getArchivedAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .not("archived_at", "is", null)
    .order("name");
  return data ?? [];
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const type = formData.get("type") as string;
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: formData.get("name"),
    type: type === "credit" ? "credit" : formData.get("type"),
    balance: parseFloat(formData.get("balance") as string) || 0,
    color: formData.get("color") || "#6366f1",
  });
  if (error) return { error: error.message };
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function getAccount(id: string): Promise<Account | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      name: formData.get("name"),
      type: formData.get("type"),
      color: formData.get("color") || "#6366f1",
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function archiveAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function restoreAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function updateAccountBalance(id: string, balance: number) {
  const supabase = await createClient();
  await supabase.from("accounts").update({ balance }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function adjustAccountBalance(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const accountId = formData.get("accountId") as string;
  const rawBalance = (formData.get("newBalance") as string) || "";
  const description = (formData.get("description") as string) || "";
  const createTxn = formData.get("createTransaction") === "true";

  if (!accountId || !rawBalance) {
    return { error: "Dados inválidos" };
  }

  const newBalance = parseCurrency(rawBalance);

  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("balance, name")
    .eq("id", accountId)
    .single();

  if (accError || !account) {
    return { error: "Conta não encontrada" };
  }

  const currentBalance = Number(account.balance);

  if (createTxn) {
    const delta = newBalance - currentBalance;
    if (Math.abs(delta) < 0.001) {
      return { error: "O novo saldo é igual ao atual" };
    }

    const type = delta > 0 ? "receita" : "despesa";
    const categoryId = await ensureAdjustmentCategory(user.id, type);

    const { error: txnError } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId,
      amount: Math.abs(delta),
      type,
      description: description || `Ajuste de saldo: ${account.name}`,
      date: new Date().toISOString().split("T")[0],
    });

    if (txnError) return { error: txnError.message };
  }

  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", accountId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

async function ensureAdjustmentCategory(userId: string, type: "receita" | "despesa"): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Ajuste de Saldo")
    .eq("type", type)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: "Ajuste de Saldo",
      type,
      color: "#f59e0b",
      icon: "wallet",
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

export async function getLastImportDates(): Promise<Record<string, string | null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("import_logs")
    .select("account_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return {};

  const map: Record<string, string | null> = {};
  for (const log of data) {
    if (!(log.account_id in map)) {
      map[log.account_id] = log.created_at;
    }
  }

  return map;
}
