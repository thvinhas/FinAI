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

  const userName = user?.user_metadata?.name ?? user?.email;

  return <AppShell userName={userName}>{children}</AppShell>;
}
