import type { Expense } from '../types/expense';

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

// Format "YYYY-MM-DD" to human-readable "15 Jan 2024"
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Use UTC to avoid timezone shifts — date is a calendar date, not a moment in time
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Format paise to INR display string
function formatAmount(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100);
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell skeleton-wide" /></td>
          <td><div className="skeleton-cell skeleton-amount" /></td>
        </tr>
      ))}
    </>
  );
}

export function ExpenseList({ expenses, loading, error, onRetry }: ExpenseListProps) {
  if (error) {
    return (
      <div className="list-state error-state">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        <button id="retry-btn" className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="expense-list-wrapper">
      <div className="table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  <div className="empty-state-content">
                    <span className="empty-icon">📭</span>
                    <p>No expenses found.</p>
                    <span className="empty-hint">Add your first expense above.</span>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="expense-row">
                  <td className="date-cell">{formatDate(expense.date)}</td>
                  <td>
                    <span className={`category-badge category-${expense.category.toLowerCase()}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="description-cell">{expense.description}</td>
                  <td className="amount-cell">{formatAmount(expense.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
