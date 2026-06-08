import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategories, getArchivedCategories } from "@/actions/categories";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import CategoryManager from "./CategoryManager";

export const metadata: Metadata = {
  title: "Categorias - FinApp",
};

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Suspense
          fallback={
            <div>
              <div className="mb-6 h-7 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="mb-4 h-5 w-28 animate-pulse rounded bg-zinc-800" />
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-zinc-800" />
                    ))}
                  </div>
                  <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
                    ))}
                  </div>
                  <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-800" />
                </div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-zinc-800" />
                      <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                      <div className="h-5 w-12 animate-pulse rounded-full bg-zinc-800" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <CategoriesContent />
        </Suspense>
      </main>
    </>
  );
}

async function CategoriesContent() {
  const [categories, archivedCategories] = await Promise.all([
    getCategories(),
    getArchivedCategories(),
  ]);

  return (
    <>
      <h1 className="mb-8 text-2xl font-bold text-white">Categorias</h1>
      <CategoryManager
        categories={categories}
        archivedCategories={archivedCategories}
      />
    </>
  );
}
