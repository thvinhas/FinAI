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
          <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          {pending ? "Conectando..." : "Entrar com Google"}
        </button>
      </div>

      <div className="text-center text-xs text-faint">Dados fictícios para demonstração</div>
    </div>
  );
}
