import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import KeywordManager from "@/app/(app)/import/KeywordManager"
import IgnoreKeywordManager from "@/app/(app)/import/IgnoreKeywordManager"
import TransferMappingManager from "@/app/(app)/import/TransferMappingManager"
import TelegramSettingsCard from "@/components/TelegramSettingsCard"
import AppearanceCard from "@/components/AppearanceCard"
import type { Account } from "@/types/database"
import type { TransferMapping } from "@/types/import"

export const metadata = {
  title: "Configurações - FinApp",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [accountsResult, mappingsResult, telegramResult] = await Promise.all([
    supabase.from("accounts").select("*").is("archived_at", null).order("name"),
    supabase.from("import_transfer_mappings").select("*").eq("user_id", user.id),
    supabase.from("telegram_links").select("*").eq("user_id", user.id).maybeSingle(),
  ])

  const accounts = (accountsResult.data ?? []) as Account[]
  const telegramLink = telegramResult.data as { id: string; user_id: string; chat_id: number | null; token: string; created_at: string } | null
  const mappings = (mappingsResult.data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    description: r.description,
    transfer_type: r.transfer_type as "origin" | "destination",
    account_id: r.account_id,
    source_account_id: r.source_account_id,
    created_at: r.created_at,
  })) as TransferMapping[]

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-5">
      <h1 className="font-heading text-xl font-bold">Configurações</h1>

      <div className="flex flex-col gap-4">
        <AppearanceCard />
        <TelegramSettingsCard link={telegramLink} />
        <TransferMappingManager mappings={mappings} accounts={accounts} />
        <KeywordManager />
        <IgnoreKeywordManager />
      </div>
    </div>
  )
}
