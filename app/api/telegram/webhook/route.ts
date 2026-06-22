import { webhookCallback } from "grammy"
import { getBot } from "@/lib/telegram/bot"

const bot = getBot()

export const POST = webhookCallback(bot, "std/http")
