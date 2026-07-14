"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, deleteCategory, updateCategory, seedDefaultCategories } from "@/actions/categories";
import { Sparkles } from "lucide-react";
import Input from "@/components/Input";
import SearchSelect from "@/components/SearchSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/types/database";
import { cn } from "@/lib/utils";

type CategoryWithCount = Category & { count: number };

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#06b6d4", "#22c55e", "#a855f7",
  "#e11d48", "#0ea5e9", "#d946ef", "#84cc16",
  "#f43f5e", "#64748b", "#fb923c", "#2dd4bf",
  "#eab308", "#475569", "#a78bfa", "#34d399",
];

const smallBtnClass =
  "rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground";
const smallBtnDangerClass =
  "rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-negative transition-colors hover:opacity-80";

function ColorPicker({
  usedColors,
  selected,
  disabled,
}: {
  usedColors: Set<string>;
  selected: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLORS.map((c) => {
        const used = usedColors.has(c) && c !== selected;
        return (
          <label key={c} className={cn("group cursor-pointer", disabled && "pointer-events-none opacity-50")}>
            <input
              type="radio"
              name="color"
              value={c}
              defaultChecked={c === selected}
              className="peer sr-only"
              disabled={disabled}
            />
            <div
              className={cn(
                "size-8 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-foreground",
                used && "ring-2 ring-negative/70"
              )}
              style={{ backgroundColor: c }}
              title={used ? "Cor já utilizada" : undefined}
            />
          </label>
        );
      })}
    </div>
  );
}

export default function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const router = useRouter();
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [seedError, setSeedError] = useState("");

  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [deleteNeedsReassign, setDeleteNeedsReassign] = useState<number | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const usedColorsByType = useMemo(() => {
    const map: Record<string, Set<string>> = { receita: new Set(), despesa: new Set() };
    for (const cat of categories) {
      map[cat.type]?.add(cat.color);
    }
    return map;
  }, [categories]);

  const filtered = categories.filter((c) => c.type === type);
  const suggestedColor = COLORS.find((c) => !usedColorsByType[type].has(c)) ?? COLORS[0];

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createPending) return;
    setCreatePending(true);
    setCreateError("");
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    const result = await createCategory(formData);
    if (result?.error) setCreateError(result.error);
    else {
      setCreateOpen(false);
      router.refresh();
    }
    setCreatePending(false);
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError("");
    const result = await deleteCategory(deleteTarget.id, reassignToId || undefined);
    if (result?.needsReassign) {
      setDeleteNeedsReassign(result.count);
    } else if (result?.error) {
      setDeleteError(result.error);
    } else {
      setDeleteTarget(null);
      router.refresh();
    }
    setDeletePending(false);
  }

  const reassignOptions = categories.filter(
    (c) => c.type === deleteTarget?.type && c.id !== deleteTarget?.id
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">Categorias</h1>
        <button
          onClick={() => {
            setCreateOpen(true);
            setCreateError("");
          }}
          className="rounded-[11px] bg-accent px-4.5 py-2.5 text-[13.5px] font-bold text-background"
        >
          + Nova Categoria
        </button>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-surface2 p-1">
        <button
          onClick={() => setType("receita")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            type === "receita" ? "bg-positive-soft text-positive" : "text-muted-foreground"
          )}
        >
          Receita
        </button>
        <button
          onClick={() => setType("despesa")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            type === "despesa" ? "bg-negative-soft text-negative" : "text-muted-foreground"
          )}
        >
          Despesa
        </button>
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma categoria criada ainda.</p>
          <p className="max-w-85 text-[12.5px] text-faint">
            Sugestões: Alimentação, Transporte, Moradia, Salário, Freelance...
          </p>
          <button
            type="button"
            onClick={async () => {
              setSeedError("");
              const result = await seedDefaultCategories();
              if (result?.error) setSeedError(result.error);
              else router.refresh();
            }}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background"
          >
            <Sparkles size={16} />
            Adicionar categorias padrão
          </button>
          {seedError && (
            <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{seedError}</p>
          )}
        </div>
      )}

      {categories.length > 0 && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-faint">
          Nenhuma categoria de {type === "receita" ? "receita" : "despesa"} ainda.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
        {filtered.map((cat) => (
          <div
            key={cat.id}
            className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: cat.color + "26", color: cat.color }}
              >
                {cat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 truncate text-sm font-bold">{cat.name}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {cat.count} {cat.count === 1 ? "transação" : "transações"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingCategory(cat)}
                className={smallBtnClass}
              >
                Editar
              </button>
              <button
                onClick={() => {
                  setDeleteTarget(cat);
                  setReassignToId("");
                  setDeleteNeedsReassign(null);
                  setDeleteError("");
                }}
                className={smallBtnDangerClass}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria de {type === "receita" ? "Receita" : "Despesa"}</DialogTitle>
          </DialogHeader>
          {createError && (
            <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{createError}</p>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input name="name" required placeholder="Nome da categoria" disabled={createPending} />
            <ColorPicker usedColors={usedColorsByType[type]} selected={suggestedColor} disabled={createPending} />
            <button
              type="submit"
              disabled={createPending}
              className="rounded-[11px] bg-accent px-4 py-2.5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createPending ? "Salvando..." : "Adicionar"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (editPending) return;
                setEditPending(true);
                const formData = new FormData(e.currentTarget);
                await updateCategory(editingCategory.id, formData);
                router.refresh();
                setEditingCategory(null);
                setEditPending(false);
              }}
              className="flex flex-col gap-4"
            >
              <Input
                name="name"
                defaultValue={editingCategory.name}
                placeholder="Nome da categoria"
                disabled={editPending}
              />
              <ColorPicker
                usedColors={usedColorsByType[editingCategory.type]}
                selected={editingCategory.color}
                disabled={editPending}
              />
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={editPending}
                  className="flex-1 rounded-[11px] bg-accent px-4 py-2.5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editPending ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="rounded-[11px] border border-border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deletePending && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <form onSubmit={handleDelete} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <span className="font-bold text-foreground">{deleteTarget.name}</span>?
              </p>

              {deleteNeedsReassign !== null && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-muted-foreground">
                    Esta categoria possui {deleteNeedsReassign} transações vinculadas. Escolha uma categoria de destino:
                  </label>
                  <SearchSelect
                    value={reassignToId}
                    onChange={setReassignToId}
                    placeholder="Selecione uma categoria"
                    searchPlaceholder="Buscar categoria..."
                    options={reassignOptions.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                  />
                </div>
              )}

              {deleteError && (
                <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{deleteError}</p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={deletePending || (deleteNeedsReassign !== null && !reassignToId)}
                  className="flex-1 rounded-[11px] bg-negative px-4 py-2.5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletePending ? "Excluindo..." : "Confirmar exclusão"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletePending}
                  className="rounded-[11px] border border-border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
