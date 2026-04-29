import { useState, useEffect, useCallback } from 'react';
import { createExpense } from '../api/expenses';

interface ExpenseFormProps {
  onSuccess: () => void;
}

// No magic strings — categories defined as a constant
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

interface FormData {
  amount: string;
  category: string;
  description: string;
  date: string;
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

function getTodayDate(): string {
  // Use local date to match the user's timezone — expense date is a calendar date
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function validateForm(data: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.amount.trim()) {
    errors.amount = 'Amount is required';
  } else if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(data.amount.trim())) {
    errors.amount = 'Enter a valid amount (e.g. 150.75)';
  } else if (parseFloat(data.amount) <= 0) {
    errors.amount = 'Amount must be greater than zero';
  }

  if (!data.category) {
    errors.category = 'Please select a category';
  }

  if (!data.description.trim()) {
    errors.description = 'Description is required';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  }

  return errors;
}

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  // idempotencyKey generated ONCE on mount — not on every render or submit
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    category: '',
    description: '',
    date: getTodayDate(),
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate idempotency key once on mount
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear field error on change
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Client-side validation — do not call API if invalid
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setSubmitting(true);
      setSubmitError(null);
      setFieldErrors({});

      const result = await createExpense({
        amount: formData.amount.trim(),
        category: formData.category,
        description: formData.description.trim(),
        date: formData.date,
        idempotency_key: idempotencyKey,
      });

      setSubmitting(false);

      if (result.error) {
        if (result.error.errors && result.error.errors.length > 0) {
          // Field-level errors from API
          const apiErrors: FieldErrors = {};
          for (const err of result.error.errors) {
            apiErrors[err.field as keyof FormData] = err.message;
          }
          setFieldErrors(apiErrors);
        } else {
          // Generic error — network, timeout, 500
          setSubmitError(result.error.message);
        }
        // Keep form data intact on error — user can retry
        return;
      }

      // Success (200 or 201) — reset form, generate new key, show toast
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: getTodayDate(),
      });
      setIdempotencyKey(crypto.randomUUID());
      setSuccessMessage('Expense added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      onSuccess();
    },
    [formData, idempotencyKey, onSuccess]
  );

  return (
    <form id="expense-form" className="expense-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">Add Expense</h2>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <span className="alert-icon">✓</span>
          {successMessage}
        </div>
      )}

      {submitError && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          {submitError}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount" className="form-label">
            Amount (₹)
          </label>
          <input
            id="amount"
            type="text"
            name="amount"
            className={`form-input ${fieldErrors.amount ? 'input-error' : ''}`}
            placeholder="e.g. 150.75"
            value={formData.amount}
            onChange={handleChange}
            autoComplete="off"
            inputMode="decimal"
          />
          {fieldErrors.amount && (
            <span className="field-error">{fieldErrors.amount}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            name="category"
            className={`form-select ${fieldErrors.category ? 'input-error' : ''}`}
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <span className="field-error">{fieldErrors.category}</span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          className={`form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
          placeholder="What was this expense for?"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          maxLength={500}
        />
        {fieldErrors.description && (
          <span className="field-error">{fieldErrors.description}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="date" className="form-label">
          Date
        </label>
        <input
          id="date"
          type="date"
          name="date"
          className={`form-input ${fieldErrors.date ? 'input-error' : ''}`}
          value={formData.date}
          onChange={handleChange}
        />
        {fieldErrors.date && (
          <span className="field-error">{fieldErrors.date}</span>
        )}
      </div>

      <button
        id="submit-expense-btn"
        type="submit"
        className="submit-btn"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            Adding…
          </>
        ) : (
          'Add Expense'
        )}
      </button>
    </form>
  );
}
