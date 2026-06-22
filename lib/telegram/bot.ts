import { Bot } from "grammy"
import {
  handleStart,
  handleLink,
  handleContas,
  handleMessage,
  handleCallback,
} from "./handlers"

let botInstance: Bot | null = null
let botInitialized = false

export function getBot(): Bot {
  if (!botInitialized) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN não configurado")
    }

    botInstance = new Bot(token)

    botInstance.command("start", handleStart)
    botInstance.command("link", handleLink)
    botInstance.command("contas", handleContas)
    botInstance.on(":photo", (ctx) => handleMessage(ctx, "photo"))
    botInstance.on(":text", (ctx) => handleMessage(ctx, "text"))
    botInstance.callbackQuery(/select_account:(.+)/, handleCallback)
    botInstance.callbackQuery(/confirm:(.+)/, handleCallback)
    botInstance.callbackQuery("cancel", handleCallback)

    botInitialized = true
  }
  return botInstance!
}
