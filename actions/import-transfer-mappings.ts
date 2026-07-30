"use server"

import { createClient } from "@/lib/supabase/server"

export async function getTransferMappings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from("import_transfer_mappings")
    .select("*")
    .eq("user_id", user.id)
  return data ?? []
}

export async function saveTransferMapping(
  description: string,
  transferType: "origin" | "destination",
  accountId: string,
  sourceAccountId: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }
  const { error } = await supabase
    .from("import_transfer_mappings")
    .upsert(
      {
        user_id: user.id,
        description,
        transfer_type: transferType,
        account_id: accountId,
        source_account_id: sourceAccountId,
      },
      { onConflict: "user_id, description" },
    )
  if (error) return { error: error.message }
  return { success: true }
}

export async function updateTransferMapping(
  id: string,
  transferType: "origin" | "destination",
  accountId: string,
  sourceAccountId: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }
  const { error } = await supabase
    .from("import_transfer_mappings")
    .update({ transfer_type: transferType, account_id: accountId, source_account_id: sourceAccountId })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteTransferMapping(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }
  const { error } = await supabase
    .from("import_transfer_mappings")
    .delete()
    .eq("id", id)
  if (error) return { error: error.message }
  return { success: true }
}
