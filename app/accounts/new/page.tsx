import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getArchivedAccounts } from "@/actions/accounts";
import Header from "@/components/Header";
import AccountForm from "./AccountForm";

export const metadata: Metadata = {
  title: "Nova Conta - FinApp",
};

export default async function NewAccountPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const [accounts, archivedAccounts] = await Promise.all([
    getAccounts(),
    getArchivedAccounts(),
  ]);
  const existingColors = [...accounts, ...archivedAccounts].map((a) => a.color);

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Nova Conta</h1>
        <AccountForm existingColors={existingColors} />
      </main>
    </>
  );
}
