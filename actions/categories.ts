"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

export async function getArchivedCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .not("archived_at", "is", null)
    .order("name");
  return data ?? [];
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || "#6366f1",
    icon: formData.get("icon") || "tag",
  });
  if (error) return { error: error.message };
  revalidatePath("/categories");
}

export async function archiveCategory(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return {
      error:
        "Esta categoria possui transações vinculadas. Reassocie as transações a outra categoria antes de arquivar.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/categories");
}

export async function restoreCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: formData.get("name"),
      color: formData.get("color"),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/categories");
}
