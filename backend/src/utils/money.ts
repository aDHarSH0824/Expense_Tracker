// Money utility — all money conversion logic lives here only.

export function parseToPaise(input: string): number {
  // Reject scientific notation
  if (/[eE]/.test(input)) {
    throw new Error('Amount must not use scientific notation');
  }

  const parsed = parseFloat(input);

  if (isNaN(parsed) || !isFinite(parsed)) {
    throw new Error('Amount must be a valid number');
  }

  if (parsed <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Validate max 2 decimal places
  const decimalMatch = input.match(/\.(\d+)$/);
  if (decimalMatch && decimalMatch[1].length > 2) {
    throw new Error('Amount must have at most 2 decimal places');
  }

  return Math.round(parsed * 100);
}

/**
 * Format integer paise to a display string: ₹150.75
 */
export function formatFromPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100);
}
