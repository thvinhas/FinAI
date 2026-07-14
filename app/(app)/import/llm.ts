import "server-only";
import Groq from "groq-sdk";
import type { ParsedTransaction } from "@/types/import";
import { parseDate } from "./parser";

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function parseCategory(
  categoryName: string | undefined,
  categories: { id: string; name: string }[],
): string | null {
  if (!categoryName) return null;
  const match = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase().trim(),
  );
  return match?.id ?? null;
}

export interface LlmResult {
  transactions: ParsedTransaction[]
  suggested_ignore_keywords: string[]
  error?: string
}

export async function extractFromPDFText(
  text: string,
  categories: { id: string; name: string }[],
): Promise<LlmResult> {
  const groq = getGroq();
  if (!groq) return { transactions: [], suggested_ignore_keywords: [], error: "GROQ_API_KEY não configurada" };

  const categoryList =
    categories.length > 0
      ? categories.map((c) => c.name).join(", ")
      : "Nenhuma categoria cadastrada";

  const maxChars = 20000
  const truncatedText = text.substring(0, maxChars)

  if (text.length > maxChars) {
    console.warn(`[LLM] Texto truncado de ${text.length} para ${maxChars} caracteres`)
  }

  const prompt = `You are a bank statement parser. Extract all individual transactions from the text below.

RULES:
- Each transaction must have: date (YYYY-MM-DD), description, amount (positive number), type ("receita", "despesa", or "transferencia")
- Every line with a date, description, AND amount is a transaction — extract it
- DO NOT summarize or group transactions
- DO NOT return headers/footers/summary lines as transactions
- DO include every single line that has transaction data (date + description + amount)
- If you see merchant names like Tesco, Amazon, Starbucks, Uber — those are TRANSACTIONS, extract them
- Category is optional — leave null if unsure or if type is transferencia

Available categories: ${categoryList}

Return ONLY a JSON array in this exact format:
[{"date": "2024-01-01", "description": "...", "amount": 123.45, "type": "despesa", "category": null}]

TEXT:
${truncatedText}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    console.log("[LLM] Token usage:", completion.usage);
    console.log("[LLM] Raw response:", content);
    const result: any[] = JSON.parse(content);
    if (!Array.isArray(result)) {
      throw new Error("LLM response is not an array: " + JSON.stringify(result).substring(0, 200));
    }
    const txns = result
      .map((t: any) => {
        const rawType = (t.type ?? "").toLowerCase()
        const type = rawType === "transferencia"
          ? "transferencia" as const
          : rawType === "receita"
            ? "receita" as const
            : "despesa" as const
        return {
          date: parseDate(t.date) ?? "",
          description: t.description ?? "",
          amount: Math.abs(parseFloat(t.amount) || 0),
          type,
          category_id: type === "transferencia" ? null : parseCategory(t.category, categories),
          destination_account_id: null as string | null,
        }
      })
      .filter((t: ParsedTransaction) => t.date && t.description && t.amount > 0);
    console.log("[LLM] Parsed transactions:", JSON.stringify(txns, null, 2));
    return { transactions: txns, suggested_ignore_keywords: [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[LLM] Error extracting transactions:", e);
    return { transactions: [], suggested_ignore_keywords: [], error: msg };
  }
}

export async function classifyWithLLM(
  description: string,
  categories: { id: string; name: string }[],
): Promise<string | null> {
  const groq = getGroq();
  if (!groq || categories.length === 0) return null;

  const prompt = `Classifique a transacao abaixo em uma das categorias disponiveis.
Responda APENAS com o nome exato da categoria, sem pontuacao, sem explicacoes.

Descricao: "${description}"
Categorias: ${categories.map((c) => c.name).join(", ")}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 50,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[LLM] Classification answer:", answer);
    const match = categories.find(
      (c) => c.name.toLowerCase() === answer.toLowerCase(),
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function classifyBatchWithLLM(
  descriptions: string[],
  categories: { id: string; name: string }[],
): Promise<Record<string, string | null>> {
  const groq = getGroq();
  if (!groq || categories.length === 0 || descriptions.length === 0) return {};

  const catNames = categories.map((c) => c.name).join(", ");
  const items = descriptions.map((d, i) => `${i + 1}. "${d}"`).join("\n");

  const prompt = `Classifique cada transacao abaixo em uma das categorias disponiveis.
Categorias: ${catNames}

Para cada item, responda APENAS com o numero e o nome exato da categoria, um por linha.
Se nao souber, responda "null".

${items}

Exemplo de resposta:
1. Alimentacao
2. Transporte
3. null`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    console.log("[LLM] Batch classification:", content);

    const result: Record<string, string | null> = {};
    for (let i = 0; i < descriptions.length; i++) {
      const desc = descriptions[i];
      const lineRegex = new RegExp(`^${i + 1}\\.\\s*(.+)$`, "m");
      const match = content.match(lineRegex);
      if (match) {
        const answer = match[1].trim().toLowerCase();
        if (answer === "null") {
          result[desc] = null;
        } else {
          const cat = categories.find((c) => c.name.toLowerCase() === answer);
          result[desc] = cat?.id ?? null;
        }
      } else {
        result[desc] = null;
      }
    }
    return result;
  } catch (e) {
    console.error("[LLM] Batch classification error:", e);
    return {};
  }
}
