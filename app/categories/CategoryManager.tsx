"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, archiveCategory } from "@/actions/categories";
import { Archive } from "lucide-react";
import Input from "@/components/Input";
import type { Category } from "@/types/database";

const COLORS = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4",
];

export default function CategoryManager({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<"receita" | "despesa">("despesa");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    const result = await createCategory(formData);
    if (result?.error) setError(result.error);
    else router.refresh();
    setPending(false);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Nova Categoria
        </h2>
        {error && (
          <p className="mb-4 rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("despesa")}
              className={`rounded-lg px-3 py-2 text-sm ${
                type === "despesa"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType("receita")}
              className={`rounded-lg px-3 py-2 text-sm ${
                type === "receita"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              Receita
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Input
              name="name"
              required
              placeholder="Nome da categoria"
            />
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
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nenhuma categoria cadastrada. Crie uma acima.
          </p>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate text-white">{cat.name}</span>
                <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {cat.type}
                </span>
              </div>
              <form
                action={async () => {
                  await archiveCategory(cat.id);
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
          ))
        )}
      </div>
    </div>
  );
}
