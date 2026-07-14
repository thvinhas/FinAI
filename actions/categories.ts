"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const supabase = await createClient();
  const [{ data: categories }, { data: txns }] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null).order("name"),
    supabase.from("transactions").select("category_id").not("category_id", "is", null),
  ]);

  const counts: Record<string, number> = {};
  for (const t of txns ?? []) {
    if (t.category_id) counts[t.category_id] = (counts[t.category_id] ?? 0) + 1;
  }

  return (categories ?? []).map((c) => ({ ...c, count: counts[c.id] ?? 0 }));
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

export async function deleteCategory(id: string, reassignToId?: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    if (!reassignToId) {
      return { needsReassign: true as const, count };
    }
    const { error: reassignError } = await supabase
      .from("transactions")
      .update({ category_id: reassignToId })
      .eq("category_id", id);
    if (reassignError) return { error: reassignError.message };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/transactions");
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
