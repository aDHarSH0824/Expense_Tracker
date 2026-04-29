export interface Expense {
  id: string;
  amount: number; // integer paise — never a float
  category: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  created_at: string;
  idempotency_key: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number; // integer paise sum from SQL — never computed in JS
}
