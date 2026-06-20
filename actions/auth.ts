"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  console.log("[signInWithGoogle] iniciando...")
  console.log("[signInWithGoogle] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)
  console.log("[signInWithGoogle] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  const supabase = await createClient();
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined
  console.log("[signInWithGoogle] redirectTo:", redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  console.log("[signInWithGoogle] data:", data)
  console.log("[signInWithGoogle] error:", error)

  return { url: data?.url, error: error?.message }
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { name: formData.get("name") as string },
    },
  });
  if (error) return { error: error.message };
  return { success: "Conta criada! Verifique seu email." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
