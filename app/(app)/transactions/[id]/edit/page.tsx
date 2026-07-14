import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/actions/transactions";
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
    <div className="mx-auto flex w-full max-w-160 flex-col gap-5">
      <h1 className="font-heading text-xl font-bold">Editar Transação</h1>
      <TransactionForm
        categories={categories ?? []}
        accounts={accounts ?? []}
        initialData={transaction ?? undefined}
      />
    </div>
  );
}
