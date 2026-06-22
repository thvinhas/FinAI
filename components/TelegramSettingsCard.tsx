"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bot, Copy, Check, Link2, Unlink } from "lucide-react"
import { generateToken, unlinkTelegram } from "@/actions/telegram"

type TelegramLink = {
  id: string
  user_id: string
  chat_id: number | null
  token: string
  created_at: string
} | null

export default function TelegramSettingsCard({
  link,
}: {
  link: TelegramLink
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    await generateToken()
    router.refresh()
    setLoading(false)
  }

  async function handleUnlink() {
    setLoading(true)
    await unlinkTelegram()
    router.refresh()
    setLoading(false)
  }

  async function handleCopy() {
    if (!link?.token) return
    await navigator.clipboard.writeText(link.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot size={16} className="text-indigo-400" />
        <h2 className="text-sm font-medium text-white">Telegram</h2>
      </div>

      {!link && (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            Vincule sua conta do Telegram para registrar despesas enviando fotos
            de recibos ou mensagens de texto.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <Link2 size={14} />
            Gerar Token
          </button>
        </>
      )}

      {link && !link.chat_id && (
        <>
          <p className="mb-2 text-xs text-zinc-400">
            Envie este token para o bot no Telegram:
          </p>
          <div className="mb-2 flex items-center gap-2">
            <code className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-green-400">
              {link.token}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Abra o bot e envie:{" "}
            <code className="text-indigo-400">/link {link.token}</code>
          </p>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            <Unlink size={12} />
            Cancelar
          </button>
        </>
      )}

      {link?.chat_id && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-400">✅ Vinculado</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Despesas podem ser registradas via Telegram.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-red-800 hover:text-red-400 disabled:opacity-50"
            >
              <Unlink size={12} />
              Desvincular
            </button>
          </div>
        </>
      )}
    </div>
  )
}
