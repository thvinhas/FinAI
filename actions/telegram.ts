"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTelegramLink() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("telegram_links")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return data
}

export async function generateToken() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  await supabase.from("telegram_links").delete().eq("user_id", user.id)

  const { error } = await supabase.from("telegram_links").insert({
    user_id: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath("/settings")
}

export async function unlinkTelegram() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  await supabase.from("telegram_links").delete().eq("user_id", user.id)
  revalidatePath("/settings")
}
