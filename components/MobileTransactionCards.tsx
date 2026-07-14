"use client";

import { deleteTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/database";

export default function MobileTransactionCards({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 sm:hidden">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="rounded-[14px] border border-border bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="text-sm font-bold">
                {t.type === "transferencia" ? "Transferência" : t.description}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {new Date(t.date).toLocaleDateString("pt-BR")}
                {t.accounts ? ` · ${t.accounts.name}` : ""}
              </div>
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-[15px] font-bold tabular-nums",
                t.type === "receita"
                  ? "text-positive"
                  : t.type === "transferencia"
                    ? "text-transfer"
                    : "text-negative"
              )}
            >
              {t.type === "receita" ? "+" : t.type === "transferencia" ? "⇄" : "-"}
              € {Number(t.amount).toFixed(2)}
            </span>
          </div>

          {t.type === "transferencia" && t.destination_account && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {t.accounts && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: t.accounts.color + "26", color: t.accounts.color }}
                >
                  {t.accounts.name}
                </span>
              )}
              <ArrowRight size={12} />
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: t.destination_account.color + "26",
                  color: t.destination_account.color,
                }}
              >
                {t.destination_account.name}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            {t.categories ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: t.categories.color + "26", color: t.categories.color }}
              >
                {t.categories.name}
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-4 text-xs font-semibold">
              <a href={`/transactions/${t.id}/edit`} className="text-muted-foreground hover:text-foreground">
                Editar
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
                <button type="submit" className="text-negative hover:opacity-80">
                  Excluir
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
