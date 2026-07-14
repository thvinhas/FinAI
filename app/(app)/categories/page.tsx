import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategories } from "@/actions/categories";
import CategoryManager from "./CategoryManager";

export const metadata: Metadata = {
  title: "Categorias - FinApp",
};

export default async function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-5">
          <div className="h-7 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="flex gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-800/50" />
            ))}
          </div>
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}

async function CategoriesContent() {
  const categories = await getCategories();

  return <CategoryManager categories={categories} />;
}
