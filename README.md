# 💸 Expense Tracker

> A personal expense tracker built with correctness-first engineering — money as integers, idempotent submissions, and SQL-level filtering.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Running the Tests](#running-the-tests)
5. [API Reference](#api-reference)
6. [Design Decisions](#design-decisions)
7. [Trade-offs Made](#trade-offs-made)
8. [Intentionally Not Done](#intentionally-not-done)

---

## Tech Stack

### Backend
| Layer | Choice |
|---|---|
| Runtime | Node.js v18+ with TypeScript |
| Framework | Express.js |
| Database | SQLite via `better-sqlite3` |
| Validation | Zod |
| Security | `helmet`, `cors`, `morgan` |
| Testing | Vitest + Supertest |

### Frontend
| Layer | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| HTTP Client | Native `fetch` with a custom typed wrapper |
| State | `useState` + `useEffect` (no Redux) |
| Forms | Controlled components with client-side validation |
| Styling | Plain CSS |

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql          # DDL for expenses table
│   │   │   └── index.ts            # DB connection singleton
│   │   ├── routes/
│   │   │   └── expenses.ts         # POST and GET handlers
│   │   ├── middleware/
│   │   │   ├── validate.ts         # Zod schema + validation logic
│   │   │   └── errors.ts           # Centralized error handler
│   │   ├── utils/
│   │   │   └── money.ts            # parseToPaise / formatFromPaise
│   │   ├── app.ts                  # Express app + middleware wiring
│   │   └── server.ts               # Entry point + env validation
│   ├── tests/
│   │   └── expenses.test.ts        # 4 integration tests
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           # Typed fetch wrapper (retry, timeout, error parsing)
│   │   │   └── expenses.ts         # Typed API call functions
│   │   ├── components/
│   │   │   ├── ExpenseForm.tsx     # Add expense form with idempotency key
│   │   │   ├── ExpenseList.tsx     # Table with loading/error/empty states
│   │   │   ├── CategoryFilter.tsx  # Controlled filter dropdown
│   │   │   └── TotalDisplay.tsx    # Filtered total display
│   │   ├── hooks/
│   │   │   └── useExpenses.ts      # Data fetching hook with refetch
│   │   ├── types/
│   │   │   └── expense.ts          # Expense and ExpensesResponse interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend — copy and edit if needed
cp backend/.env.example backend/.env

# Frontend — copy and edit if needed
cp frontend/.env.example frontend/.env
```

**`backend/.env`**
```env
PORT=3000
DATABASE_PATH=./expenses.db
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3000
```

> ⚠️ The backend will **crash on startup** with a clear error message if `DATABASE_PATH` or `CORS_ORIGIN` are missing. This is intentional — misconfiguration should never fail silently.

### 3. Start both servers

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
# → Running on http://localhost:3000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# → Running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Running the Tests

```bash
cd backend
npm test
```

Four integration tests run against a temporary in-memory SQLite file (auto-cleaned after each run):

| Test | What it verifies |
|---|---|
| POST happy path | Returns 201, `amount` stored as integer paise, `id` is UUID, `date` is YYYY-MM-DD |
| POST idempotency | Same `idempotency_key` returns 200 on retry; exactly 1 row in DB |
| POST validation failure | `amount: "-50"` returns 400 with `errors[].field === "amount"` |
| GET category filter | `?category=Food` returns only Food expenses; `total` equals only that sum in paise |

---

## API Reference

### `POST /expenses`

Creates a new expense. **Idempotent** — safe to retry with the same `idempotency_key`.

**Request body:**
```json
{
  "amount": "150.75",
  "category": "Food",
  "description": "Dinner at restaurant",
  "date": "2024-01-15",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}
```

- `amount`: string (not a number) — e.g. `"150.75"`. Positive, max 2 decimal places, no scientific notation.
- `category`: one of `Food`, `Transport`, `Housing`, `Entertainment`, `Health`, `Shopping`, `Education`, `Other`
- `date`: `"YYYY-MM-DD"` calendar date string
- `idempotency_key`: UUID v4, generated by the client on form mount

**Responses:**

| Status | When | Body |
|---|---|---|
| `201 Created` | New expense inserted | Expense object |
| `200 OK` | `idempotency_key` already exists (duplicate/retry) | Same existing expense object |
| `400 Bad Request` | Validation failed | `{ "errors": [{ "field": "amount", "message": "..." }] }` |
| `500 Internal Server Error` | Unexpected server error | `{ "error": "Internal server error" }` |

**Response body (200/201):**
```json
{
  "id": "uuid-v4",
  "idempotency_key": "uuid-v4",
  "amount": 15075,
  "category": "Food",
  "description": "Dinner at restaurant",
  "date": "2024-01-15",
  "created_at": "2024-01-15 14:30:00"
}
```

> `amount` in the response is **integer paise** — `15075` = ₹150.75. Division by 100 happens only at the display layer.

---

### `GET /expenses`

Returns all expenses, sorted by date descending. Optionally filter by category.

**Query parameters:**

| Param | Description |
|---|---|
| `?category=Food` | Filter by category (case-insensitive) |

**Response:**
```json
{
  "expenses": [ ...Expense[] ],
  "total": 35075
}
```

- `total` is `COALESCE(SUM(amount), 0)` computed in SQL for the filtered set — never summed in JavaScript.
- Always sorted: `date DESC, created_at DESC`

---

## Design Decisions

### SQLite over a managed database
SQLite was chosen because it is zero-infrastructure, file-based, ACID-compliant, and survives process restarts. It is more than sufficient for a single-user personal tool. If this were a multi-user or cloud-native product, I would switch to PostgreSQL — the schema and queries are fully portable.

### Amounts stored as INTEGER paise (not REAL or DECIMAL)
Floating-point arithmetic cannot represent many decimal values exactly. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. For money, this is unacceptable.

The solution: store `₹150.75` as the integer `15075` in the database. Conversion happens at exactly two points:
- **Input:** `Math.round(parseFloat(input) * 100)` — string → integer
- **Display:** `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)` — integer → formatted string

Nowhere else. This is enforced by the `parseToPaise` / `formatFromPaise` utility functions in `money.ts`.

### Idempotency via client-generated UUID
The spec requires that the API behave correctly even if the client retries the same request due to network issues, page reloads, or double-clicks.

**How it works:**
1. The `ExpenseForm` component generates a UUID v4 (`crypto.randomUUID()`) **when it mounts** — not on every submit.
2. This key is sent with every submission as `idempotency_key`.
3. The server runs `INSERT OR IGNORE INTO expenses ... VALUES (...)` — SQLite's `UNIQUE` constraint on `idempotency_key` silently ignores a duplicate insert.
4. A `SELECT` after the insert retrieves the definitive record regardless of whether it was just inserted or already existed.
5. `result.changes === 1` → `201 Created`; `result.changes === 0` → `200 OK` (duplicate, no new row created).
6. The key is **reset** (new UUID generated) only after a confirmed success — so retries on timeout or network error always use the same key and are safe.

### Date stored as TEXT "YYYY-MM-DD"
An expense date is a **calendar date**, not a moment in time. A user recording a ₹500 grocery expense on "15 January 2024" means January 15th — not a UTC timestamp.

Storing as `datetime()` introduces timezone bugs: "2024-01-15" in IST (UTC+5:30) stored as a UTC timestamp becomes `"2024-01-14T18:30:00Z"` which can display as January 14th in some environments. Storing as the literal string `"2024-01-15"` has no timezone ambiguity whatsoever.

### Filtering and sorting done in SQL
The `GET /expenses` endpoint builds its `WHERE` and `ORDER BY` clauses dynamically in SQL. The `total` is computed as `COALESCE(SUM(amount), 0)` in the same SQL query with the same WHERE clause.

If filtering were done in JavaScript (fetch all, then filter), the returned `total` would represent all expenses, not the filtered set — which would be incorrect and confusing to users.

### API client with typed wrapper
Components never call `fetch()` directly. All HTTP goes through `api/client.ts` which:
- Reads `VITE_API_URL` from the environment (no hardcoded URLs)
- Attaches `AbortController` with a 10-second timeout on every request
- Retries `GET` requests up to 3 times on **network failures only** (not on 4xx/5xx) with exponential backoff (500ms → 1s → 2s)
- Does **not** auto-retry `POST` — the idempotency key makes manual retry safe
- Always returns `{ data, error, status }` — never throws — so components have a consistent error handling pattern

---

## Trade-offs Made

| Decision | Reason |
|---|---|
| No authentication | Single-user tool per spec. Adding auth would require session management and per-user data isolation — out of scope. |
| SQLite file storage | Fine for single-instance deployment. Would not work across multiple backend replicas — would switch to PostgreSQL with connection pooling for that. |
| No pagination | Acceptable for personal use at this scale. Would add cursor-based pagination (`WHERE id < ?` + `LIMIT`) for a multi-user production system. |
| Category as free-text (validated to enum) | Flexible. The enum is enforced by Zod on the backend and a `<select>` on the frontend, so inconsistency (`"food"` vs `"Food"`) cannot happen in practice. |
| No `PATCH` or `DELETE` endpoints | Not in the spec. The idempotency design means expenses are append-only, which is correct for an audit-style record. |

---

## Intentionally Not Done

- **Authentication / multi-user support** — Out of scope. Every request has access to all data.
- **`PATCH /expenses/:id` or `DELETE /expenses/:id`** — Not specified. Would implement with a `deleted_at` soft-delete field in production rather than hard deletes.
- **Recurring expenses, budgets, or file uploads** — Out of scope.
- **Pagination** — Data volume does not require it for single-user use.
- **Category summary endpoint (`GET /expenses/summary`)** — A nice-to-have in the implementation plan but not required by the core spec.
- **Deployment** — Not yet deployed. Backend targets Render.com (with persistent disk for SQLite); frontend targets Vercel.
