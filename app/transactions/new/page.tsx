import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import TransactionForm from "./TransactionForm";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("name");

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">
          Nova Transação
        </h1>
        <TransactionForm
          categories={categories ?? []}
          accounts={accounts ?? []}
        />
      </main>
    </>
  );
}
