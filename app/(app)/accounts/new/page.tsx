import type { Metadata } from "next";
import { getAccounts, getArchivedAccounts } from "@/actions/accounts";
import AccountForm from "./AccountForm";

export const metadata: Metadata = {
  title: "Nova Conta - FinApp",
};

export default async function NewAccountPage() {
  const [accounts, archivedAccounts] = await Promise.all([
    getAccounts(),
    getArchivedAccounts(),
  ]);
  const existingColors = [...accounts, ...archivedAccounts].map((a) => a.color);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <h1 className="font-heading text-xl font-bold">Nova Conta</h1>
      <AccountForm existingColors={existingColors} />
    </div>
  );
}
