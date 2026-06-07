import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import AccountForm from "./AccountForm";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Nova Conta</h1>
        <AccountForm />
      </main>
    </>
  );
}
