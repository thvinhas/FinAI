export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  })
}

export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/[€]\s*/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Nunca"
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
