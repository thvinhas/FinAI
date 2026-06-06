import { getTransactions } from "@/actions/transactions";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import TransactionList from "./TransactionList";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const transactions = await getTransactions();

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Transações</h1>
          <a
            href="/transactions/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Nova Transação
          </a>
        </div>
        <TransactionList transactions={transactions} />
      </main>
    </>
  );
}
