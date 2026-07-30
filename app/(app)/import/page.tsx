import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { buildKeywordMap } from "./categorizer"
import { getLastImportDates } from "@/actions/accounts"
import ImportForm from "./ImportForm"
import type { Category, Account } from "@/types/database"

export const metadata = {
  title: "Importar Transações",
}

export default async function ImportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [accountsResult, categoriesResult, txnsResult, ignoreKeywordsResult, transferMappingsResult, lastImportDates] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("transactions")
      .select("description, category_id")
      .not("category_id", "is", null)
      .not("description", "is", null),
    supabase
      .from("import_ignore_keywords")
      .select("keyword")
      .eq("user_id", user.id)
      .order("keyword"),
    supabase
      .from("import_transfer_mappings")
      .select("*")
      .eq("user_id", user.id),
    getLastImportDates(),
  ])

  const keywordMap = buildKeywordMap(txnsResult.data ?? [])
  const initialIgnoreKeywords = (ignoreKeywordsResult.data ?? []).map((r) => r.keyword)
  const initialTransferMappings = (transferMappingsResult.data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    description: r.description,
    transfer_type: r.transfer_type as "origin" | "destination",
    account_id: r.account_id,
    source_account_id: r.source_account_id,
    created_at: r.created_at,
  }))

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-xl font-bold">Importar Extrato</h1>
      <ImportForm
        accounts={(accountsResult.data ?? []) as Account[]}
        categories={(categoriesResult.data ?? []) as Category[]}
        keywordMap={keywordMap}
        initialIgnoreKeywords={initialIgnoreKeywords}
        initialTransferMappings={initialTransferMappings}
        lastImportDates={lastImportDates}
      />
    </div>
  )
}
