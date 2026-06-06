import { getCategories } from "@/actions/categories";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import CategoryManager from "./CategoryManager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const categories = await getCategories();

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Categorias</h1>
        <CategoryManager categories={categories} />
      </main>
    </>
  );
}
