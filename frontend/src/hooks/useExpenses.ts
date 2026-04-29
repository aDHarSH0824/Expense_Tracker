import { useState, useEffect, useCallback } from 'react';
import { getExpenses } from '../api/expenses';
import type { Expense } from '../types/expense';

interface UseExpensesFilters {
  category?: string;
}

interface UseExpensesResult {
  expenses: Expense[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExpenses(filters: UseExpensesFilters): UseExpensesResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData(): Promise<void> {
      setLoading(true);
      // Clear error but keep previous expenses visible during refetch
      setError(null);

      const result = await getExpenses({ category: filters.category });

      if (cancelled) return;

      if (result.error) {
        setError(result.error.message);
        // Keep previous expenses visible — don't clear them on error
      } else if (result.data) {
        setExpenses(result.data.expenses);
        setTotal(result.data.total);
      }

      setLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [filters.category, fetchTrigger]);

  return { expenses, total, loading, error, refetch };
}
