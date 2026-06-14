function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  return [...new Set(words)]
}

const STOP_WORDS = new Set([
  "com", "para", "por", "que", "dos", "das", "mais", "mas",
  "ate", "esta", "esse", "isso", "aos", "pelo", "como",
  "pag", "ref", "nfs", "doc", "rec", "pix",
])

export function buildKeywordMap(
  transactions: { description: string | null; category_id: string | null }[]
): Record<string, string> {
  const freq = new Map<string, Map<string, number>>()

  for (const t of transactions) {
    if (!t.description || !t.category_id) continue
    const words = extractKeywords(t.description)
    for (const w of words) {
      if (!freq.has(w)) freq.set(w, new Map())
      const cats = freq.get(w)!
      cats.set(t.category_id, (cats.get(t.category_id) ?? 0) + 1)
    }
  }

  const map: Record<string, string> = {}
  for (const [word, cats] of freq) {
    let best = ""
    let max = 0
    for (const [catId, count] of cats) {
      if (count > max) {
        max = count
        best = catId
      }
    }
    if (max >= 2) map[word] = best
  }

  return map
}

export function applyKeywordMap(
  description: string,
  keywordMap: Record<string, string>
): string | null {
  const words = extractKeywords(description)
  for (const w of words) {
    const catId = keywordMap[w]
    if (catId) return catId
  }
  return null
}
