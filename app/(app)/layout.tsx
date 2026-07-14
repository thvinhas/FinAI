import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell userName={user?.email}>{children}</AppShell>;
}
