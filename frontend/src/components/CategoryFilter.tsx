interface CategoryFilterProps {
  value: string;
  onFilterChange: (category: string | undefined) => void;
}

// No magic strings — categories list matches the backend
const CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Entertainment',
  'Health',
  'Shopping',
  'Education',
  'Other',
] as const;

export function CategoryFilter({ value, onFilterChange }: CategoryFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="category-filter" className="filter-label">
        Filter by Category
      </label>
      <select
        id="category-filter"
        className="filter-select"
        value={value}
        onChange={(e) => onFilterChange(e.target.value || undefined)}
      >
        <option value="">All Categories</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}
