export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  })
}

export function parseCurrency(value: string): number {
  let cleaned = value.replace(/[€\s]/gi, "").trim()
  if (!cleaned) return 0

  const lastDot = cleaned.lastIndexOf(".")
  const lastComma = cleaned.lastIndexOf(",")

  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) {
      cleaned = cleaned.replace(/,/g, "")
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    }
  } else if (lastDot > -1) {
    const dotCount = cleaned.match(/\./g)?.length ?? 0
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "")
    }
  } else if (lastComma > -1) {
    cleaned = cleaned.replace(",", ".")
  }

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
