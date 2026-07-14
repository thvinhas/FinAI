"use client";

import { useState } from "react";
import { signInWithEmail, signUp } from "@/actions/auth";
import { createClient } from "@/lib/supabase/browser";
import Input from "@/components/Input";
import { cn } from "@/lib/utils";

const supabase = createClient();

export function LoginForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setSuccess("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (isSignUp) {
      const result = await signUp(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.success);
    } else {
      const result = await signInWithEmail(formData);
      if (result?.error) setError(result.error);
    }
    setPending(false);
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-7">
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex size-12 items-center justify-center rounded-[14px] bg-accent">
          <div className="size-[18px] rounded-full border-[3px] border-background" />
        </div>
        <div className="font-heading text-[22px] font-bold tracking-tight">FinApp</div>
        <div className="text-[13px] text-muted-foreground">Suas finanças, com clareza</div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-7 shadow-card">
        <div className="flex gap-1 rounded-xl bg-surface2 p-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError("");
              setSuccess("");
            }}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-semibold transition-colors",
              !isSignUp ? "bg-surface text-foreground shadow-card" : "text-muted-foreground"
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError("");
              setSuccess("");
            }}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-semibold transition-colors",
              isSignUp ? "bg-surface text-foreground shadow-card" : "text-muted-foreground"
            )}
          >
            Cadastrar
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-positive-soft p-3 text-sm text-positive">{success}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] text-muted-foreground">Nome</label>
              <Input name="name" required />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] text-muted-foreground">E-mail</label>
            <Input name="email" type="email" placeholder="voce@email.com" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] text-muted-foreground">Senha</label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-3 text-[14.5px] font-bold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <div className="flex items-center gap-2.5 text-xs text-faint">
          <div className="h-px flex-1 bg-border" />
          ou
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setPending(true);
            setError("");
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin + "/auth/callback",
              },
            });
            if (error) {
              setError(error.message);
              setPending(false);
            }
          }}
          disabled={pending}
          className="flex items-center justify-center gap-2.5 rounded-lg border border-border bg-surface2 px-4 py-3 text-sm font-semibold text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className="size-4 rounded-full"
            style={{
              background:
                "conic-gradient(#4285F4 0 25%,#34A853 25% 50%,#FBBC05 50% 75%,#EA4335 75% 100%)",
            }}
          />
          {pending ? "Conectando..." : "Entrar com Google"}
        </button>
      </div>

      <div className="text-center text-xs text-faint">Dados fictícios para demonstração</div>
    </div>
  );
}
