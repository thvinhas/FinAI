"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, createTransfer, suggestCategory } from "@/actions/transactions";
import { createCategory } from "@/actions/categories";
import { Plus, X } from "lucide-react";
import Input from "@/components/Input";
import SearchSelect from "@/components/SearchSelect";
import CurrencyInput from "@/components/CurrencyInput";
import type { Category, Account, Transaction } from "@/types/database";
import { updateTransaction } from "@/actions/transactions";

const CATEGORY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4", "#22c55e", "#a855f7",
  "#e11d48", "#0ea5e9", "#d946ef", "#84cc16",
  "#f43f5e", "#64748b", "#fb923c", "#2dd4bf",
  "#eab308", "#475569", "#a78bfa", "#34d399",
];

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
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? "");
  const [localCategories, setLocalCategories] = useState(categories);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const usedCategoryColors = useMemo(() => {
    return new Set(
      localCategories.filter((c) => c.type === type).map((c) => c.color)
    );
  }, [localCategories, type]);

  const suggestedCategoryColor = useMemo(
    () => CATEGORY_COLORS.find((c) => !usedCategoryColors.has(c)) ?? CATEGORY_COLORS[0],
    [usedCategoryColors]
  );

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const formData = new FormData();
    formData.set("name", newCategoryName.trim());
    formData.set("type", type);
    formData.set("color", suggestedCategoryColor);

    const result = await createCategory(formData);
    if (result?.error) return;

    const newCat: Category = {
      id: result.id,
      user_id: "",
      name: newCategoryName.trim(),
      type: type as "receita" | "despesa",
      color: suggestedCategoryColor,
      icon: "tag",
      created_at: new Date().toISOString(),
      archived_at: null,
    };

    setLocalCategories((prev) => [...prev, newCat]);
    setCategoryId(result.id);
    setShowAddCategory(false);
    setNewCategoryName("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const formType = formData.get("type") as FormType;

    if (formType !== "transferencia") {
      formData.set("category_id", categoryId);
    }

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

  useEffect(() => {
    if (!description.trim()) return;
    const timer = setTimeout(async () => {
      const suggested = await suggestCategory(description);
      if (suggested) setCategoryId(suggested);
    }, 500);
    return () => clearTimeout(timer);
  }, [description]);

  const filteredCategories = localCategories.filter((c) => c.type === type);

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
                  label: `${a.name} (€ ${Number(a.balance).toFixed(2)})`,
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
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDescription(e.target.value)
              }
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
                  label: `${a.name} (€ ${Number(a.balance).toFixed(2)})`,
                  color: a.color,
                })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Categoria <span className="text-red-400">*</span>
            </label>
            <SearchSelect
              key={type}
              name="category_id"
              value={categoryId}
              onChange={setCategoryId}
              required
              placeholder="Selecione uma categoria"
              searchPlaceholder="Buscar categoria..."
              onAddLabel="+ Adicionar categoria"
              onAdd={() => setShowAddCategory(true)}
              options={
                filteredCategories.length > 0
                  ? filteredCategories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      color: c.color,
                    }))
                  : [{ value: "", label: "Nenhuma categoria disponível" }]
              }
            />
            {showAddCategory && (
              <form onSubmit={handleAddCategory} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da nova categoria"
                  autoFocus
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </form>
            )}
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
