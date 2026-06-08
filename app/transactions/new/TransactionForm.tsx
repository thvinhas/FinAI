"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, createTransfer } from "@/actions/transactions";
import Input from "@/components/Input";
import SearchSelect from "@/components/SearchSelect";
import CurrencyInput from "@/components/CurrencyInput";
import type { Category, Account, Transaction } from "@/types/database";
import { updateTransaction } from "@/actions/transactions";

type FormType = "receita" | "despesa" | "transferencia";

export default function TransactionForm({
  categories,
  accounts,
  initialData,
}: {
  categories: Category[];
  accounts: Account[];
  initialData?: Transaction;
}) {
  const router = useRouter();
  const [type, setType] = useState<FormType>(
    (initialData?.type as FormType) ?? "despesa"
  );
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
      initialData
        ? await updateTransaction(initialData.id, formData)
        : formType === "transferencia"
          ? await createTransfer(formData)
          : await createTransaction(formData);

    if (result?.error) setError(result.error);
    else router.push(
      initialData
        ? "/transactions?success=Transação+atualizada"
        : "/transactions?success=Transação+criada"
    );
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
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Conta de Origem
            </label>
            <SearchSelect
              name="from_account_id"
              required
              placeholder="Selecione"
              searchPlaceholder="Buscar conta..."
              defaultValue={initialData?.account_id ?? ""}
              options={[
                { value: "", label: "Selecione" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (R$ ${Number(a.balance).toFixed(2)})`,
                  color: a.color,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Conta de Destino
            </label>
            <SearchSelect
              name="to_account_id"
              required
              placeholder="Selecione"
              searchPlaceholder="Buscar conta..."
              defaultValue={initialData?.destination_account_id ?? ""}
              options={[
                { value: "", label: "Selecione" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  color: a.color,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Valor</label>
            <CurrencyInput
              name="amount"
              required
              placeholder="0,00"
              defaultValue={initialData?.amount ?? 0}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Data</label>
            <Input
              name="date"
              type="date"
              defaultValue={
                initialData
                  ? initialData.date.split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Valor</label>
            <CurrencyInput
              name="amount"
              required
              placeholder="0,00"
              defaultValue={initialData?.amount ?? 0}
              autoFocus={!initialData}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Descrição
            </label>
            <Input
              name="description"
              required
              placeholder="Ex: Salário, Supermercado..."
              defaultValue={initialData?.description ?? ""}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Conta</label>
            <SearchSelect
              name="account_id"
              placeholder="Selecione uma conta"
              searchPlaceholder="Buscar conta..."
              defaultValue={initialData?.account_id ?? ""}
              options={[
                { value: "", label: "Selecione uma conta" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (R$ ${Number(a.balance).toFixed(2)})`,
                  color: a.color,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Categoria
            </label>
            <SearchSelect
              key={type}
              name="category_id"
              placeholder="Sem categoria"
              searchPlaceholder="Buscar categoria..."
              defaultValue={initialData?.category_id ?? ""}
              options={[
                { value: "", label: "Sem categoria" },
                ...filteredCategories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Data</label>
            <Input
              name="date"
              type="date"
              defaultValue={
                initialData
                  ? initialData.date.split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
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
