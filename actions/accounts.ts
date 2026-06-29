"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Account } from "@/types/database";

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .is("archived_at", null)
    .order("balance", { ascending: false });
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
