import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TransactionForm from "./TransactionForm";

export const metadata: Metadata = {
  title: "Nova Transação - FinApp",
};

export default async function NewTransactionPage() {
  const supabase = await createClient();

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
      <h1 className="font-heading text-xl font-bold">Nova Transação</h1>
      <TransactionForm
        categories={categories ?? []}
        accounts={accounts ?? []}
      />
    </div>
  );
}
