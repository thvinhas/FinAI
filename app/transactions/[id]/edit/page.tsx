import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/actions/transactions";
import Header from "@/components/Header";
import TransactionForm from "../../new/TransactionForm";

export const metadata: Metadata = {
  title: "Editar Transação - FinApp",
};

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const { id } = await params;
  const transaction = await getTransaction(id);

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
          Editar Transação
        </h1>
        <TransactionForm
          categories={categories ?? []}
          accounts={accounts ?? []}
          initialData={transaction ?? undefined}
        />
      </main>
    </>
  );
}
