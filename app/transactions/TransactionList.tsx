"use client";

import { deleteTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/types/database";

export default function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <p className="text-zinc-500">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900">
          <tr>
            <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">Data</th>
            <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">Descrição</th>
            <th className="hidden px-3 py-3 font-medium text-zinc-400 sm:table-cell sm:px-4">Conta</th>
            <th className="hidden px-3 py-3 font-medium text-zinc-400 sm:table-cell sm:px-4">Categoria</th>
            <th className="px-3 py-3 font-medium text-zinc-400 sm:px-4">Valor</th>
            <th className="px-3 py-3 sm:px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {transactions.map((t) => (
            <tr key={t.id} className="bg-zinc-950 hover:bg-zinc-900/50">
              <td className="whitespace-nowrap px-3 py-3 text-zinc-300 sm:px-4">
                {new Date(t.date).toLocaleDateString("pt-BR")}
              </td>
              <td className="max-w-[140px] truncate px-3 py-3 text-white sm:max-w-none sm:px-4">
                {t.type === "transferencia" ? (
                  <span className="text-indigo-400">Transferência</span>
                ) : (
                  t.description
                )}
              </td>
              <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                {t.type === "transferencia" ? (
                  <div className="flex items-center gap-1.5">
                    {t.accounts ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: t.accounts.color + "20",
                          color: t.accounts.color,
                        }}
                      >
                        {t.accounts.name}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                    <span className="text-zinc-500">→</span>
                    {t.destination_account ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: t.destination_account.color + "20",
                          color: t.destination_account.color,
                        }}
                      >
                        {t.destination_account.name}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </div>
                ) : t.accounts ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: t.accounts.color + "20",
                      color: t.accounts.color,
                    }}
                  >
                    {t.accounts.name}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                {t.categories ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: t.categories.color + "20",
                      color: t.categories.color,
                    }}
                  >
                    {t.categories.name}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className={`whitespace-nowrap px-3 py-3 font-medium sm:px-4 ${
                t.type === "receita"
                  ? "text-emerald-400"
                  : t.type === "transferencia"
                    ? "text-indigo-400"
                    : "text-red-400"
              }`}>
                {t.type === "receita"
                  ? "+"
                  : t.type === "transferencia"
                    ? "⇄"
                    : "-"}
                R$ {Number(t.amount).toFixed(2)}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <form
                  action={async () => {
                    await deleteTransaction(t.id);
                    router.refresh();
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-zinc-600 transition-colors hover:text-red-400"
                  >
                    <span className="hidden sm:inline">Excluir</span>
                    <span className="sm:hidden">✕</span>
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
