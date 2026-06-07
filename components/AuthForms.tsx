"use client";

import { useState } from "react";
import { signInWithEmail, signUp, signInWithGoogle } from "@/actions/auth";
import Input from "@/components/Input";

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
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-white">
        {isSignUp ? "Criar Conta" : "Entrar"}
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg bg-green-900/50 p-3 text-sm text-green-300">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Nome</label>
            <Input name="name" required />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">Email</label>
          <Input name="email" type="email" required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">Senha</label>
          <Input name="password" type="password" required />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Aguarde..." : isSignUp ? "Cadastrar" : "Entrar"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-sm text-zinc-500">ou</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800"
        >
          Entrar com Google
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setSuccess("");
          }}
          className="text-indigo-400 hover:underline"
        >
          {isSignUp ? "Entrar" : "Cadastrar"}
        </button>
      </p>
    </div>
  );
}
