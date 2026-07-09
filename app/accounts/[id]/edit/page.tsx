import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAccount, getAccounts, getArchivedAccounts } from "@/actions/accounts";
import Header from "@/components/Header";
import AccountForm from "../../new/AccountForm";

export const metadata: Metadata = {
  title: "Editar Conta - FinApp",
};

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const { id } = await params;

  const [account, accounts, archivedAccounts] = await Promise.all([
    getAccount(id),
    getAccounts(),
    getArchivedAccounts(),
  ]);
  const existingColors = [...accounts, ...archivedAccounts].map((a) => a.color);

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Editar Conta</h1>
        <AccountForm initialData={account ?? undefined} existingColors={existingColors} />
      </main>
    </>
  );
}
