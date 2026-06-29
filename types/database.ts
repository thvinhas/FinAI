export interface Account {
  id: string
  user_id: string
  name: string
  type: "checking" | "savings" | "cash" | "credit"
  balance: number
  color: string
  created_at: string | null
  archived_at: string | null
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: "receita" | "despesa"
  color: string
  icon: string
  created_at: string | null
  archived_at: string | null
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  type: "receita" | "despesa" | "transferencia"
  description: string
  date: string
  created_at: string | null
  account_id: string | null
  destination_account_id: string | null
  categories: Category | null
  accounts: Account | null
  destination_account: Account | null
}

export interface ImportKeyword {
  id: string
  user_id: string
  keyword: string
  created_at: string
}

export interface ImportLog {
  id: string
  user_id: string
  account_id: string
  transaction_count: number
  created_at: string | null
}
