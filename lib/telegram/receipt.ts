import Groq from "groq-sdk"

async function fileUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")
  return `data:image/jpeg;base64,${base64}`
}

export async function extractFromPhoto(
  imageUrl: string,
): Promise<{ amount: number; description: string; date: string | null } | null> {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key) return null

    const groq = new Groq({ apiKey: key })
    const base64Image = await fileUrlToBase64(imageUrl)

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extraia os dados do comprovante/recibo: valor total, nome do estabelecimento (loja, restaurante, etc), e data. " +
                "Responda APENAS com JSON: {\"amount\": 12.34, \"description\": \"...\", \"date\": \"2026-06-21\"}. " +
                "Se não encontrar a data, use null. Valor deve ser número positivo. Retorne APENAS o nome do estabelecimento, não os produtos comprados.",
            },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 200,
    })

    const content = completion.choices[0]?.message?.content ?? "{}"
    const result = JSON.parse(content)
    if (!result.amount || !result.description) return null
    return {
      amount: Math.abs(parseFloat(result.amount) || 0),
      description: String(result.description),
      date: result.date || null,
    }
  } catch {
    return null
  }
}
