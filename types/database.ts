export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "cash" | "credit";
  balance: number;
  color: string;
  created_at: string;
  archived_at?: string | null;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: "receita" | "despesa";
  color: string;
  icon: string;
  created_at: string;
  archived_at?: string | null;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  destination_account_id: string | null;
  amount: number;
  type: "receita" | "despesa" | "transferencia";
  description: string;
  date: string;
  created_at: string;
  categories?: Category | null;
  accounts?: Account | null;
  destination_account?: Account | null;
};
