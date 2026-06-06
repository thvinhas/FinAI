"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, createTransfer } from "@/actions/transactions";
import CurrencyInput from "@/components/CurrencyInput";
import type { Category, Account } from "@/types/database";

type FormType = "receita" | "despesa" | "transferencia";

export default function TransactionForm({
  categories,
  accounts,
}: {
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [type, setType] = useState<FormType>("despesa");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const formType = formData.get("type") as FormType;

    const result =
      formType === "transferencia"
        ? await createTransfer(formData)
        : await createTransaction(formData);

    if (result?.error) setError(result.error);
    else router.push("/transactions");
    setPending(false);
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {[
          { value: "despesa" as const, label: "Despesa", short: "Desp.", active: "bg-red-600 text-white", inactive: "bg-zinc-800 text-zinc-400" },
          { value: "receita" as const, label: "Receita", short: "Rec.", active: "bg-emerald-600 text-white", inactive: "bg-zinc-800 text-zinc-400" },
          { value: "transferencia" as const, label: "Transferência", short: "Transf.", active: "bg-indigo-600 text-white", inactive: "bg-zinc-800 text-zinc-400" },
        ].map((btn) => (
          <button
            key={btn.value}
            type="button"
            onClick={() => setType(btn.value)}
            className={`flex-1 rounded-lg px-2 py-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              type === btn.value ? btn.active : btn.inactive
            }`}
          >
            <span className="hidden sm:inline">{btn.label}</span>
            <span className="sm:hidden">{btn.short}</span>
          </button>
        ))}
      </div>

      <input type="hidden" name="type" value={type} />

      {type === "transferencia" ? (
        <>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Conta de Origem
            </label>
            <select
              name="from_account_id"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (R$ {Number(a.balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Conta de Destino
            </label>
            <select
              name="to_account_id"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Valor</label>
            <CurrencyInput name="amount" required placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Data</label>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Valor</label>
            <CurrencyInput name="amount" required placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Descrição
            </label>
            <input
              name="description"
              required
              placeholder="Ex: Salário, Supermercado..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Conta</label>
            <select
              name="account_id"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (R$ {Number(a.balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Categoria
            </label>
            <select
              name="category_id"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Data</label>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-400 transition-colors hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
