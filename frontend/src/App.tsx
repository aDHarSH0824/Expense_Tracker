import { useState, useCallback } from 'react';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { CategoryFilter } from './components/CategoryFilter';
import { TotalDisplay } from './components/TotalDisplay';
import { useExpenses } from './hooks/useExpenses';

function App() {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const { expenses, total, loading, error, refetch } = useExpenses({
    category: categoryFilter,
  });

  const handleFilterChange = useCallback((category: string | undefined) => {
    setCategoryFilter(category);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">💸</span>
            <div>
              <h1 className="header-title">Expense Tracker</h1>
              <p className="header-subtitle">Track your spending, control your finances</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="layout-grid">
          {/* Left column: Add expense form */}
          <aside className="form-column">
            <ExpenseForm onSuccess={refetch} />
          </aside>

          {/* Right column: Filter, total, list */}
          <section className="list-column">
            <div className="list-header">
              <CategoryFilter
                value={categoryFilter ?? ''}
                onFilterChange={handleFilterChange}
              />
              <TotalDisplay total={total} loading={loading} />
            </div>

            <ExpenseList
              expenses={expenses}
              loading={loading}
              error={error}
              onRetry={refetch}
            />
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>Amounts stored in paise · Sorted by date (newest first)</p>
      </footer>
    </div>
  );
}

export default App;
