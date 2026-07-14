"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, createTransfer, suggestCategory } from "@/actions/transactions";
import { createCategory } from "@/actions/categories";
import { Plus, X } from "lucide-react";
import Input from "@/components/Input";
import SearchSelect from "@/components/SearchSelect";
import CurrencyInput from "@/components/CurrencyInput";
import type { Category, Account, Transaction } from "@/types/database";
import { updateTransaction } from "@/actions/transactions";
import { cn } from "@/lib/utils";

type FormType = "receita" | "despesa" | "transferencia";

const TYPE_OPTIONS: { value: FormType; label: string; short: string; active: string }[] = [
  { value: "despesa", label: "Despesa", short: "Desp.", active: "bg-negative-soft text-negative" },
  { value: "receita", label: "Receita", short: "Rec.", active: "bg-positive-soft text-positive" },
  { value: "transferencia", label: "Transferência", short: "Transf.", active: "bg-transfer-soft text-transfer" },
];

const fieldLabelClass = "text-[12.5px] font-semibold text-muted-foreground";

const CATEGORY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4", "#22c55e", "#a855f7",
  "#e11d48", "#0ea5e9", "#d946ef", "#84cc16",
  "#f43f5e", "#64748b", "#fb923c", "#2dd4bf",
  "#eab308", "#475569", "#a78bfa", "#34d399",
];

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
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
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
    const timer = setTimeout(async () => {
      const suggested = description.trim() ? await suggestCategory(description) : null;
      setSuggestedCategoryId(suggested ?? null);
    }, 500);
    return () => clearTimeout(timer);
  }, [description]);

  const filteredCategories = localCategories.filter((c) => c.type === type);
  const suggestedCategory =
    suggestedCategoryId && suggestedCategoryId !== categoryId
      ? filteredCategories.find((c) => c.id === suggestedCategoryId)
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
          {error}
        </p>
      )}

      <div className="flex gap-1 rounded-xl bg-surface2 p-1">
        {TYPE_OPTIONS.map((btn) => (
          <button
            key={btn.value}
            type="button"
            onClick={() => setType(btn.value)}
            className={cn(
              "flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
              type === btn.value ? btn.active : "text-muted-foreground"
            )}
          >
            <span className="hidden sm:inline">{btn.label}</span>
            <span className="sm:hidden">{btn.short}</span>
          </button>
        ))}
      </div>

      <input type="hidden" name="type" value={type} />

      <div className="flex flex-col gap-[18px] rounded-2xl border border-border bg-surface p-[26px]">
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass}>Valor</label>
          <CurrencyInput
            name="amount"
            required
            placeholder="0,00"
            defaultValue={initialData?.amount ?? 0}
            autoFocus={!initialData}
            large
          />
        </div>

        {type !== "transferencia" && (
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClass}>Descrição</label>
            <Input
              name="description"
              required
              placeholder="Ex: Salário, Supermercado..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDescription(e.target.value)
              }
            />
            {suggestedCategory && (
              <div className="text-xs text-muted-foreground">
                Sugestão:{" "}
                <button
                  type="button"
                  onClick={() => setCategoryId(suggestedCategory.id)}
                  className="font-bold text-accent"
                >
                  {suggestedCategory.name}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClass}>
              {type === "transferencia" ? "Conta de Origem" : "Conta"}
            </label>
            <SearchSelect
              name={type === "transferencia" ? "from_account_id" : "account_id"}
              required={type === "transferencia"}
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

          {type === "transferencia" ? (
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabelClass}>Conta de Destino</label>
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
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabelClass}>
                Categoria <span className="text-negative">*</span>
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
                    className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-background hover:opacity-90"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName("");
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClass}>Data</label>
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
        </div>
      </div>

      <div className="flex justify-end gap-2.5">
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
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
