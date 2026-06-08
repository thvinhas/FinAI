"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount, updateAccount } from "@/actions/accounts";
import Input from "@/components/Input";
import Select from "@/components/Select";
import CurrencyInput from "@/components/CurrencyInput";
import type { Account } from "@/types/database";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
];

export default function AccountForm({
  initialData,
}: {
  initialData?: Account;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = initialData
      ? await updateAccount(initialData.id, formData)
      : await createAccount(formData);
    if (result?.error) setError(result.error);
    else router.push(
      initialData
        ? "/accounts?success=Conta+atualizada"
        : "/accounts?success=Conta+criada"
    );
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">Nome</label>
        <Input
          name="name"
          required
          placeholder="Ex: Nubank, Itaú, Carteira..."
          defaultValue={initialData?.name ?? ""}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">Tipo</label>
        <Select name="type" defaultValue={initialData?.type ?? "checking"}>
          <option value="checking">Conta Corrente</option>
          <option value="savings">Poupança</option>
          <option value="cash">Dinheiro</option>
          <option value="credit">Cartão de Crédito</option>
        </Select>
      </div>

      {!initialData && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Saldo Inicial
          </label>
          <CurrencyInput name="balance" defaultValue={0} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-zinc-400">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={c === (initialData?.color ?? "#6366f1")}
                className="sr-only peer"
              />
              <div
                className="h-8 w-8 rounded-full ring-offset-2 ring-offset-zinc-950 peer-checked:ring-2 peer-checked:ring-white"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Salvando..." : initialData ? "Salvar" : "Criar Conta"}
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
