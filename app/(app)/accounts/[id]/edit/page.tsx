import type { Metadata } from "next";
import { getAccount, getAccounts, getArchivedAccounts } from "@/actions/accounts";
import AccountForm from "../../new/AccountForm";

export const metadata: Metadata = {
  title: "Editar Conta - FinApp",
};

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [account, accounts, archivedAccounts] = await Promise.all([
    getAccount(id),
    getAccounts(),
    getArchivedAccounts(),
  ]);
  const existingColors = [...accounts, ...archivedAccounts].map((a) => a.color);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <h1 className="font-heading text-xl font-bold">Editar Conta</h1>
      <AccountForm initialData={account ?? undefined} existingColors={existingColors} />
    </div>
  );
}
