"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveAccount, restoreAccount, adjustAccountBalance } from "@/actions/accounts";
import { PiggyBank, Building2, Wallet, CreditCard, Archive, RotateCcw, Pencil, Scale, X } from "lucide-react";
import type { Account } from "@/types/database";
import { formatDate } from "@/lib/format";

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
  archivedAccounts,
  lastImportDates = {},
}: {
  accounts: Account[];
  archivedAccounts?: Account[];
  lastImportDates?: Record<string, string | null>;
}) {
  const router = useRouter();

  const [adjustTarget, setAdjustTarget] = useState<Account | null>(null);
  const [adjustNewBalance, setAdjustNewBalance] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustCreateTxn, setAdjustCreateTxn] = useState(true);
  const [adjustPending, setAdjustPending] = useState(false);
  const [adjustError, setAdjustError] = useState("");

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
    <>
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-400">Saldo Total</p>
        <p
          className={`mt-1 text-3xl font-bold ${
            total >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          € {total.toFixed(2)}
        </p>
      </div>

      {accounts.map((acc) => {
        return (
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
              <p className="mt-0.5 text-[11px] text-zinc-600">
                Último import: {formatDate(lastImportDates[acc.id] ?? null)}
              </p>
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
              € {Number(acc.balance).toFixed(2)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAdjustTarget(acc);
                  setAdjustNewBalance(Number(acc.balance).toFixed(2));
                  setAdjustDescription("");
                  setAdjustCreateTxn(true);
                  setAdjustError("");
                }}
                className="flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-emerald-400"
              >
                <Scale size={14} />
                <span className="hidden sm:inline">Ajustar</span>
              </button>
              <a
                href={`/accounts/${acc.id}/edit`}
                className="flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-indigo-400"
              >
                <Pencil size={14} />
                <span className="hidden sm:inline">Editar</span>
              </a>
              <form
                onSubmit={(e) => {
                  if (!confirm("Arquivar esta conta?")) e.preventDefault();
                }}
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
      );
      })}

      {archivedAccounts && archivedAccounts.length > 0 && (
        <details className="group rounded-xl border border-zinc-800">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            <Archive size={14} />
            Contas arquivadas ({archivedAccounts.length})
          </summary>
          <div className="divide-y divide-zinc-800 border-t border-zinc-800">
            {archivedAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full opacity-50"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span className="truncate text-sm text-zinc-400">
                    {acc.name}
                  </span>
                </div>
                <form
                  action={async () => {
                    await restoreAccount(acc.id);
                    router.refresh();
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-emerald-400"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Restaurar</span>
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>

      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !adjustPending && setAdjustTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Ajustar Saldo</h2>
              <button
                onClick={() => setAdjustTarget(null)}
                disabled={adjustPending}
                className="text-zinc-600 transition-colors hover:text-zinc-400 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdjustPending(true);
                setAdjustError("");

                const formData = new FormData();
                formData.set("accountId", adjustTarget.id);
                formData.set("newBalance", adjustNewBalance);
                formData.set("description", adjustDescription);
                formData.set("createTransaction", String(adjustCreateTxn));

                const result = await adjustAccountBalance(formData);
                if (result?.error) {
                  setAdjustError(result.error);
                  setAdjustPending(false);
                } else {
                  setAdjustTarget(null);
                  setAdjustPending(false);
                  router.refresh();
                }
              }}
              className="space-y-4"
            >
              <div className="rounded-lg bg-zinc-900/50 p-3">
                <p className="text-xs text-zinc-500">Conta</p>
                <p className="text-sm font-medium text-white">{adjustTarget.name}</p>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-3">
                <p className="text-xs text-zinc-500">Saldo atual</p>
                <p className="text-lg font-semibold text-white">
                  € {Number(adjustTarget.balance).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Novo saldo
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={adjustNewBalance}
                  onChange={(e) => setAdjustNewBalance(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-500 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Descrição <span className="text-zinc-600">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Ajuste manual de saldo"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-500 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg bg-zinc-900/50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustCreateTxn}
                  onChange={(e) => setAdjustCreateTxn(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Criar transação de ajuste</p>
                  <p className="text-xs text-zinc-500">
                    Registra a diferença como uma transação com categoria &ldquo;Ajuste de Saldo&rdquo;
                  </p>
                </div>
              </label>

              {adjustError && (
                <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
                  {adjustError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={adjustPending}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adjustPending ? "Ajustando..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  disabled={adjustPending}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
