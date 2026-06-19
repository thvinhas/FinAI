import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/Header"
import KeywordManager from "@/app/import/KeywordManager"
import IgnoreKeywordManager from "@/app/import/IgnoreKeywordManager"
import TransferMappingManager from "@/app/import/TransferMappingManager"
import type { Account } from "@/types/database"
import type { TransferMapping } from "@/types/import"

export const metadata = {
  title: "Configurações - FinApp",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [accountsResult, mappingsResult] = await Promise.all([
    supabase.from("accounts").select("*").is("archived_at", null).order("name"),
    supabase.from("import_transfer_mappings").select("*").eq("user_id", user.id),
  ])

  const accounts = (accountsResult.data ?? []) as Account[]
  const mappings = (mappingsResult.data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    description: r.description,
    transfer_type: r.transfer_type as "origin" | "destination",
    account_id: r.account_id,
    created_at: r.created_at,
  })) as TransferMapping[]

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Configurações</h1>

        <div className="space-y-6">
          <TransferMappingManager
            mappings={mappings}
            accounts={accounts}
            showTitle
          />
          <IgnoreKeywordManager showTitle />
          <KeywordManager showTitle />
        </div>
      </main>
    </>
  )
}
