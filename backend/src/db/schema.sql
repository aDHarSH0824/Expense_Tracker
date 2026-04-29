CREATE TABLE IF NOT EXISTS expenses (
  id               TEXT PRIMARY KEY,
  idempotency_key  TEXT UNIQUE NOT NULL,
  amount           INTEGER NOT NULL CHECK(amount > 0),
  category         TEXT NOT NULL CHECK(length(trim(category)) > 0),
  description      TEXT NOT NULL CHECK(length(trim(description)) > 0),
  date             TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
