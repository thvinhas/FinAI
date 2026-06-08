import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/actions/accounts";
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
  const account = await getAccount(id);

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Editar Conta</h1>
        <AccountForm initialData={account ?? undefined} />
      </main>
    </>
  );
}
