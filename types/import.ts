export type ParsedTransaction = {
  date: string
  description: string
  amount: number
  type: "receita" | "despesa" | "transferencia"
  category_id: string | null
  destination_account_id?: string | null
  origin_account_id?: string | null
}

export type TransferMapping = {
  id: string
  user_id: string
  description: string
  transfer_type: "origin" | "destination"
  account_id: string
  source_account_id: string | null
  created_at: string
}

export type FileFormat = "csv" | "ofx" | "pdf"

export type ColumnMapping = {
  date: number
  description: number
  amount: number
  type: number | null
}
