"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveAccount, restoreAccount, adjustAccountBalance } from "@/actions/accounts";
import { RotateCcw, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Account } from "@/types/database";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
};

const smallBtnClass =
  "rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground";
const smallBtnDangerClass =
  "rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-negative transition-colors hover:opacity-80";

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
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="mb-4 text-sm text-faint">Nenhuma conta cadastrada.</p>
        <a
          href="/accounts/new"
          className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background"
        >
          Criar primeira conta
        </a>
      </div>
    );
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-surface p-[22px]">
          <div className="mb-2 text-[13px] font-semibold text-muted-foreground">Saldo Total</div>
          <div
            className={cn(
              "font-heading text-[28px] font-bold tabular-nums",
              total >= 0 ? "text-positive" : "text-negative"
            )}
          >
            € {total.toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: acc.color + "26", color: acc.color }}
                >
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-bold">{acc.name}</div>
                  <div className="text-xs text-muted-foreground">{labels[acc.type] ?? acc.type}</div>
                </div>
              </div>
              <div
                className={cn(
                  "font-heading text-[22px] font-bold tabular-nums",
                  Number(acc.balance) >= 0 ? "text-positive" : "text-negative"
                )}
              >
                € {Number(acc.balance).toFixed(2)}
              </div>
              <div className="text-[11.5px] text-faint">
                Último import: {formatDate(lastImportDates[acc.id] ?? null)}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/accounts/${acc.id}/edit`} className={smallBtnClass}>
                  Editar
                </a>
                <button
                  onClick={() => {
                    setAdjustTarget(acc);
                    setAdjustNewBalance(Number(acc.balance).toFixed(2));
                    setAdjustDescription("");
                    setAdjustCreateTxn(true);
                    setAdjustError("");
                  }}
                  className={smallBtnClass}
                >
                  Ajustar Saldo
                </button>
                <form
                  onSubmit={(e) => {
                    if (!confirm("Arquivar esta conta?")) e.preventDefault();
                  }}
                  action={async () => {
                    await archiveAccount(acc.id);
                    router.refresh();
                  }}
                >
                  <button type="submit" className={smallBtnDangerClass}>
                    Arquivar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {archivedAccounts && archivedAccounts.length > 0 && (
          <details className="group rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[13.5px] font-bold">
              Contas Arquivadas ({archivedAccounts.length})
              <ChevronDown size={16} className="text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-2.5 px-5 pb-4">
              {archivedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-[10px] bg-surface2 p-3"
                >
                  <span className="text-[13.5px] font-semibold">{acc.name}</span>
                  <form
                    action={async () => {
                      await restoreAccount(acc.id);
                      router.refresh();
                    }}
                  >
                    <button type="submit" className={smallBtnClass}>
                      <span className="inline-flex items-center gap-1.5">
                        <RotateCcw size={13} />
                        Restaurar
                      </span>
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && !adjustPending && setAdjustTarget(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
          {adjustTarget && (
            <>
              <DialogTitle>Ajustar Saldo</DialogTitle>
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
                className="flex flex-col gap-4"
              >
                <div className="rounded-lg bg-surface2 p-3">
                  <p className="text-xs text-muted-foreground">Conta</p>
                  <p className="text-sm font-bold">{adjustTarget.name}</p>
                </div>

                <div className="rounded-lg bg-surface2 p-3">
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                  <p className="font-heading text-lg font-bold tabular-nums">
                    € {Number(adjustTarget.balance).toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-muted-foreground">
                    Novo saldo
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={adjustNewBalance}
                    onChange={(e) => setAdjustNewBalance(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-muted-foreground">
                    Descrição <span className="text-faint">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder="Ajuste manual de saldo"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-surface2 p-3">
                  <input
                    type="checkbox"
                    checked={adjustCreateTxn}
                    onChange={(e) => setAdjustCreateTxn(e.target.checked)}
                    className="size-4 rounded border-border accent-accent"
                  />
                  <div>
                    <p className="text-sm font-semibold">Criar transação de ajuste</p>
                    <p className="text-xs text-muted-foreground">
                      Registra a diferença como uma transação com categoria &ldquo;Ajuste de Saldo&rdquo;
                    </p>
                  </div>
                </label>

                {adjustError && (
                  <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
                    {adjustError}
                  </p>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    disabled={adjustPending}
                    className="flex-1 rounded-[11px] bg-accent px-4 py-2.5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adjustPending ? "Ajustando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustTarget(null)}
                    disabled={adjustPending}
                    className="rounded-[11px] border border-border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
