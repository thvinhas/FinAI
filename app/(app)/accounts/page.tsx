import { Suspense } from "react";
import type { Metadata } from "next";
import { getAccounts, getArchivedAccounts, getLastImportDates } from "@/actions/accounts";
import Toast from "@/components/Toast";
import AccountList from "./AccountList";

export const metadata: Metadata = {
  title: "Contas - FinApp",
};

export default async function AccountsPage() {
  return (
    <>
      <Suspense fallback={null}><Toast /></Suspense>
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
    </>
  );
}

async function AccountsContent() {
  const [accounts, archivedAccounts, lastImportDates] = await Promise.all([
    getAccounts(),
    getArchivedAccounts(),
    getLastImportDates(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">Contas</h1>
        <a
          href="/accounts/new"
          className="rounded-[11px] bg-accent px-[18px] py-2.5 text-[13.5px] font-bold text-background"
        >
          + Nova Conta
        </a>
      </div>
      <AccountList
        accounts={accounts ?? []}
        archivedAccounts={archivedAccounts ?? []}
        lastImportDates={lastImportDates}
      />
    </div>
  );
}
