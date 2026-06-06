import { createClient } from "@/lib/supabase/server";
import { getAccounts } from "@/actions/accounts";
import Header from "@/components/Header";
import AccountList from "./AccountList";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const accounts = await getAccounts();

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Contas</h1>
          <a
            href="/accounts/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Nova Conta
          </a>
        </div>
        <AccountList accounts={accounts ?? []} />
      </main>
    </>
  );
}
