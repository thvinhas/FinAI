"use client";

import { deleteTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import type { Transaction } from "@/types/database";

export default function MobileTransactionCards({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-3 sm:hidden">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {new Date(t.date).toLocaleDateString("pt-BR")}
            </span>
            <span
              className={`text-sm font-semibold ${
                t.type === "receita"
                  ? "text-emerald-400"
                  : t.type === "transferencia"
                    ? "text-indigo-400"
                    : "text-red-400"
              }`}
            >
              {t.type === "receita" ? "+" : t.type === "transferencia" ? "⇄" : "-"}
              R$ {Number(t.amount).toFixed(2)}
            </span>
          </div>

          <p className="truncate text-sm font-medium text-white">
            {t.type === "transferencia" ? "Transferência" : t.description}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {t.accounts && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: t.accounts.color + "20",
                  color: t.accounts.color,
                }}
              >
                {t.accounts.name}
              </span>
            )}
            {t.type === "transferencia" && t.destination_account && (
              <>
                <ArrowRight size={12} className="text-zinc-500" />
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: t.destination_account.color + "20",
                    color: t.destination_account.color,
                  }}
                >
                  {t.destination_account.name}
                </span>
              </>
            )}
            {t.categories && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: t.categories.color + "20",
                  color: t.categories.color,
                }}
              >
                {t.categories.name}
              </span>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-zinc-800 pt-2">
            <a
              href={`/transactions/${t.id}/edit`}
              className="text-zinc-500 transition-colors hover:text-indigo-400"
            >
              <Pencil size={15} />
            </a>
            <form
              onSubmit={(e) => {
                if (!confirm("Excluir esta transação?")) e.preventDefault();
              }}
              action={async () => {
                await deleteTransaction(t.id);
                router.refresh();
              }}
            >
              <button
                type="submit"
                className="text-zinc-500 transition-colors hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
