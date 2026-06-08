import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getArchivedAccounts } from "@/actions/accounts";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import AccountList from "./AccountList";

export const metadata: Metadata = {
  title: "Contas - FinApp",
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <>
      <Header userName={user?.email} />
      <Suspense fallback={null}><Toast /></Suspense>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Suspense
          fallback={
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="h-7 w-28 animate-pulse rounded bg-zinc-800" />
                <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-zinc-800" />
                      <div className="h-4 flex-1 animate-pulse rounded bg-zinc-800" />
                    </div>
                    <div className="h-6 w-24 animate-pulse rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <AccountsContent />
        </Suspense>
      </main>
    </>
  );
}

async function AccountsContent() {
  const [accounts, archivedAccounts] = await Promise.all([
    getAccounts(),
    getArchivedAccounts(),
  ]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Contas</h1>
        <a
          href="/accounts/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Nova Conta
        </a>
      </div>
      <AccountList
        accounts={accounts ?? []}
        archivedAccounts={archivedAccounts ?? []}
      />
    </>
  );
}
