"use client";

import { useState, useMemo } from "react";
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
  existingColors = [],
}: {
  initialData?: Account;
  existingColors?: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const usedColors = useMemo(() => {
    const set = new Set(existingColors);
    if (initialData?.color) set.delete(initialData.color);
    return set;
  }, [existingColors, initialData]);

  const suggestedColor = useMemo(
    () => COLORS.find((c) => !usedColors.has(c)) ?? COLORS[0],
    [usedColors]
  );

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-[26px]">
      {error && (
        <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-muted-foreground">Nome</label>
        <Input
          name="name"
          required
          placeholder="Ex: Nubank, Itaú, Carteira..."
          defaultValue={initialData?.name ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-muted-foreground">Tipo</label>
        <Select name="type" defaultValue={initialData?.type ?? "checking"}>
          <option value="checking">Conta Corrente</option>
          <option value="savings">Poupança</option>
          <option value="cash">Dinheiro</option>
          <option value="credit">Cartão de Crédito</option>
        </Select>
      </div>

      {!initialData && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-muted-foreground">
            Saldo Inicial
          </label>
          <CurrencyInput name="balance" defaultValue={0} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-muted-foreground">Cor</label>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => {
            const used = usedColors.has(c);
            return (
              <label key={c} className="group cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={c}
                  defaultChecked={c === (initialData?.color ?? suggestedColor)}
                  className="peer sr-only"
                />
                <div
                  className={`size-8 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-foreground ${used ? "ring-2 ring-negative/70" : ""}`}
                  style={{ backgroundColor: c }}
                  title={used ? "Cor já utilizada" : undefined}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-[11px] border border-border px-5 py-2.5 text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[11px] bg-accent px-[22px] py-2.5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Salvando..." : initialData ? "Salvar" : "Criar Conta"}
        </button>
      </div>
    </form>
  );
}
