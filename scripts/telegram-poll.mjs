import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, "..", ".env.local")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...rest] = trimmed.split("=")
    process.env[key] = rest.join("=")
  }
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = "http://localhost:3000/api/telegram/webhook"
const BASE = `https://api.telegram.org/bot${TOKEN}`
let offset = 0

console.log("🤖 Polling Telegram for updates...")
console.log(`   Forwarding to ${WEBHOOK_URL}\n`)

async function poll() {
  try {
    const res = await fetch(`${BASE}/getUpdates?offset=${offset}&timeout=30`)
    const data = await res.json()

    if (!data.ok) {
      console.error("getUpdates error:", data)
      setTimeout(poll, 3000)
      return
    }

    for (const update of data.result) {
      offset = update.update_id + 1

      console.log(`\n📩 Update #${update.update_id}: ${update.message?.text || update.callback_query?.data || "[photo]"}`)

      const webhookRes = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })

      const text = await webhookRes.text()
      console.log(`   → ${webhookRes.status} ${text.substring(0, 200)}`)
    }

    setTimeout(poll, 100)
  } catch (err) {
    console.error("Poll error:", err.message)
    setTimeout(poll, 3000)
  }
}

poll()
