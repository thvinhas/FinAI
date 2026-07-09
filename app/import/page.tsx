import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/Header"
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
    created_at: r.created_at,
  }))

  return (
    <>
      <Header userName={user?.email} />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-white">
        Importar Transações
      </h1>
      <ImportForm
        accounts={(accountsResult.data ?? []) as Account[]}
        categories={(categoriesResult.data ?? []) as Category[]}
        keywordMap={keywordMap}
        initialIgnoreKeywords={initialIgnoreKeywords}
        initialTransferMappings={initialTransferMappings}
        lastImportDates={lastImportDates}
      />
    </div>
    </>
  )
}
