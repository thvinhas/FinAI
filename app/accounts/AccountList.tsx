"use client";

import { useRouter } from "next/navigation";
import { archiveAccount, restoreAccount } from "@/actions/accounts";
import { PiggyBank, Building2, Wallet, CreditCard, Archive, RotateCcw, Pencil } from "lucide-react";
import type { Account } from "@/types/database";

const icons: Record<string, React.ReactNode> = {
  checking: <Building2 size={20} />,
  savings: <PiggyBank size={20} />,
  cash: <Wallet size={20} />,
  credit: <CreditCard size={20} />,
};

const labels: Record<string, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
};

export default function AccountList({
  accounts,
}: {
  accounts: Account[];
}) {
  const router = useRouter();

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <p className="mb-4 text-zinc-500">Nenhuma conta cadastrada.</p>
        <a
          href="/accounts/new"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Criar primeira conta
        </a>
      </div>
    );
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-400">Saldo Total</p>
        <p
          className={`mt-1 text-3xl font-bold ${
            total >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          R$ {total.toFixed(2)}
        </p>
      </div>

      {accounts.map((acc) => (
        <div
          key={acc.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: acc.color + "20", color: acc.color }}
            >
              {icons[acc.type] ?? <Wallet size={20} />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{acc.name}</p>
              <p className="text-xs text-zinc-500">{labels[acc.type] ?? acc.type}</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:gap-4">
            <p
              className={`font-semibold ${
                Number(acc.balance) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              R$ {Number(acc.balance).toFixed(2)}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`/accounts/${acc.id}/edit`}
                className="flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-indigo-400"
              >
                <Pencil size={14} />
                <span className="hidden sm:inline">Editar</span>
              </a>
              <form
                action={async () => {
                  await archiveAccount(acc.id);
                  router.refresh();
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-yellow-400"
                >
                  <Archive size={14} />
                  <span className="hidden sm:inline">Arquivar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
