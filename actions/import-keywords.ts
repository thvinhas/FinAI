"use server"

import { createClient } from "@/lib/supabase/server"

export async function getImportKeywords(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("import_keywords")
    .select("keyword")
    .eq("user_id", user.id)
    .order("keyword")

  return (data ?? []).map((r) => r.keyword)
}

export async function addImportKeyword(keyword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const kw = keyword.trim().toLowerCase()
  if (!kw) return { error: "Palavra-chave inválida" }

  const { error } = await supabase
    .from("import_keywords")
    .insert({ user_id: user.id, keyword: kw })

  if (error) {
    if (error.code === "23505") return { error: "Palavra-chave já cadastrada" }
    return { error: error.message }
  }
}

export async function removeImportKeyword(keyword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { error } = await supabase
    .from("import_keywords")
    .delete()
    .eq("user_id", user.id)
    .eq("keyword", keyword.trim().toLowerCase())

  if (error) return { error: error.message }
}
