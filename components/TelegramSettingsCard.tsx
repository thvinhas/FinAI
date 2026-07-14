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
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5.5">
      <div className="flex items-center gap-2.5">
        <Bot size={17} className="text-accent" />
        <h2 className="text-[15px] font-bold">Telegram</h2>
      </div>

      {!link && (
        <>
          <p className="text-[12.5px] text-muted-foreground">
            Vincule sua conta do Telegram para registrar despesas enviando fotos
            de recibos ou mensagens de texto.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex w-fit items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 text-xs font-bold text-background disabled:opacity-50"
          >
            <Link2 size={14} />
            Gerar Token
          </button>
        </>
      )}

      {link && !link.chat_id && (
        <>
          <p className="text-xs text-muted-foreground">
            Envie este token para o bot no Telegram:
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-surface2 px-3 py-1.5 text-sm text-positive">
              {link.token}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface2 hover:text-foreground"
            >
              {copied ? <Check size={14} className="text-positive" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-faint">
            Abra o bot e envie:{" "}
            <code className="text-accent">/link {link.token}</code>
          </p>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={loading}
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-negative"
          >
            <Unlink size={12} />
            Cancelar
          </button>
        </>
      )}

      {link?.chat_id && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-positive">✅ Vinculado</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Despesas podem ser registradas via Telegram.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-negative disabled:opacity-50"
          >
            <Unlink size={12} />
            Desvincular
          </button>
        </div>
      )}
    </div>
  )
}
