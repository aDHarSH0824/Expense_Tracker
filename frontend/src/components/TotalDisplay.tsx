interface TotalDisplayProps {
  total: number; // integer paise from API
  loading: boolean;
}

// Format paise to INR display string — only division by 100 happens here at display layer
function formatTotal(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100);
}

export function TotalDisplay({ total, loading }: TotalDisplayProps) {
  return (
    <div className="total-display">
      <span className="total-label">Total</span>
      <span className="total-value">
        {loading ? (
          <span className="total-placeholder">—</span>
        ) : (
          formatTotal(total)
        )}
      </span>
    </div>
  );
}
