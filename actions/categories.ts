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

  const { data, error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || "#6366f1",
    icon: formData.get("icon") || "tag",
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/categories");
  return { id: data.id };
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

const DEFAULT_CATEGORIES: { name: string; type: "receita" | "despesa"; color: string }[] = [
  // ── Receitas ──────────────────────────────────
  { name: "Salário",          type: "receita",  color: "#10b981" },
  { name: "Freelance",        type: "receita",  color: "#14b8a6" },
  { name: "Investimentos",    type: "receita",  color: "#3b82f6" },
  { name: "Renda Extra",      type: "receita",  color: "#8b5cf6" },
  { name: "Vendas",           type: "receita",  color: "#ec4899" },
  { name: "Presente",         type: "receita",  color: "#f59e0b" },
  { name: "Reembolso",        type: "receita",  color: "#06b6d4" },
  { name: "Aluguel Recebido", type: "receita",  color: "#6366f1" },
  { name: "Bônus / Prêmio",   type: "receita",  color: "#eab308" },
  // ── Despesas ───────────────────────────────────
  { name: "Moradia / Aluguel",  type: "despesa", color: "#e11d48" },
  { name: "Condomínio",         type: "despesa", color: "#fb7185" },
  { name: "Supermercado",       type: "despesa", color: "#ef4444" },
  { name: "Restaurante",        type: "despesa", color: "#f97316" },
  { name: "Fast Food",          type: "despesa", color: "#fdba74" },
  { name: "Café / Padaria",     type: "despesa", color: "#d97706" },
  { name: "Transporte",         type: "despesa", color: "#f97316" },
  { name: "Gasolina",           type: "despesa", color: "#ea580c" },
  { name: "Uber / Táxi",        type: "despesa", color: "#fb923c" },
  { name: "Saúde / Farmácia",   type: "despesa", color: "#10b981" },
  { name: "Plano de Saúde",     type: "despesa", color: "#34d399" },
  { name: "Educação",           type: "despesa", color: "#8b5cf6" },
  { name: "Curso / Online",     type: "despesa", color: "#a78bfa" },
  { name: "Streaming",          type: "despesa", color: "#a855f7" },
  { name: "Assinaturas",        type: "despesa", color: "#c084fc" },
  { name: "Tecnologia",         type: "despesa", color: "#3b82f6" },
  { name: "Internet / Celular", type: "despesa", color: "#60a5fa" },
  { name: "Roupas",             type: "despesa", color: "#ec4899" },
  { name: "Beleza / Cuidados",  type: "despesa", color: "#f472b6" },
  { name: "Academia / Fitness", type: "despesa", color: "#22c55e" },
  { name: "Lazer",              type: "despesa", color: "#f59e0b" },
  { name: "Cinema / Shows",     type: "despesa", color: "#fbbf24" },
  { name: "Viagem",             type: "despesa", color: "#14b8a6" },
  { name: "Hospedagem",         type: "despesa", color: "#2dd4bf" },
  { name: "Compras Online",     type: "despesa", color: "#d946ef" },
  { name: "Pets",               type: "despesa", color: "#f43f5e" },
  { name: "Energia",            type: "despesa", color: "#f59e0b" },
  { name: "Água / Esgoto",      type: "despesa", color: "#0ea5e9" },
  { name: "Seguros",            type: "despesa", color: "#64748b" },
  { name: "Impostos",           type: "despesa", color: "#475569" },
  { name: "Outras Despesas",    type: "despesa", color: "#6b7280" },
]

export async function seedDefaultCategories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
  if (count && count > 0) {
    return { error: "Você já possui categorias cadastradas." }
  }

  const inserts = DEFAULT_CATEGORIES.map((cat) => ({
    user_id: user.id,
    name: cat.name,
    type: cat.type,
    color: cat.color,
    icon: "tag",
  }))

  const { error } = await supabase.from("categories").insert(inserts)
  if (error) return { error: error.message }
  revalidatePath("/categories")
}
