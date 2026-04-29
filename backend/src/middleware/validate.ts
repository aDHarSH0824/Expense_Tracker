import { z } from 'zod';

// No magic strings — categories defined as a constant
export const CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Entertainment',
  'Health',
  'Shopping',
  'Education',
  'Other',
] as const;

// UUID v4 pattern
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// YYYY-MM-DD calendar date validation
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(dateStr);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

export const createExpenseSchema = z.object({
  amount: z
    .string()
    .refine((val) => !/[eE]/.test(val), {
      message: 'Amount must not use scientific notation',
    })
    .refine((val) => !isNaN(parseFloat(val)) && isFinite(parseFloat(val)), {
      message: 'Amount must be a valid number',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Amount must be greater than zero',
    })
    .refine(
      (val) => {
        const decimalMatch = val.match(/\.(\d+)$/);
        return !decimalMatch || decimalMatch[1].length <= 2;
      },
      { message: 'Amount must have at most 2 decimal places' }
    ),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category must be at most 50 characters'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description must be at most 500 characters'),
  date: z
    .string()
    .refine((val) => isValidCalendarDate(val), {
      message: 'Date must be a valid date in YYYY-MM-DD format',
    }),
  idempotency_key: z
    .string()
    .regex(UUID_V4_REGEX, 'idempotency_key must be a valid UUID v4'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
