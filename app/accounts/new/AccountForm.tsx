"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/actions/accounts";
import CurrencyInput from "@/components/CurrencyInput";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
];

export default function AccountForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createAccount(formData);
    if (result?.error) setError(result.error);
    else router.push("/accounts");
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
        <label className="mb-1 block text-sm text-zinc-400">Nome</label>
        <input
          name="name"
          required
          placeholder="Ex: Nubank, Itaú, Carteira..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-400">Tipo</label>
        <select
          name="type"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
        >
          <option value="checking">Conta Corrente</option>
          <option value="savings">Poupança</option>
          <option value="cash">Dinheiro</option>
          <option value="credit">Cartão de Crédito</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-400">
          Saldo Inicial
        </label>
        <CurrencyInput name="balance" defaultValue={0} />
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-400">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={c === "#6366f1"}
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Criar Conta"}
      </button>
    </form>
  );
}
