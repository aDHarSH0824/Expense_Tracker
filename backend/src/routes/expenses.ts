import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { getDb } from '../db';
import { createExpenseSchema } from '../middleware/validate';
import { parseToPaise } from '../utils/money';

const router = Router();

interface ExpenseRow {
  id: string;
  idempotency_key: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

// POST /expenses — idempotent create
router.post('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate request body with Zod
    const parseResult = createExpenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path[0] as string,
        message: issue.message,
      }));
      res.status(400).json({ errors });
      return;
    }

    const { amount, category, description, date, idempotency_key } =
      parseResult.data;

    const amountInPaise = parseToPaise(amount);
    const id = uuidv4();
    const db = getDb();

    // Step 1: Attempt INSERT OR IGNORE — idempotency guarantee via UNIQUE constraint
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO expenses
        (id, idempotency_key, amount, category, description, date)
      VALUES
        (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      id,
      idempotency_key,
      amountInPaise,
      category.trim(),
      description.trim(),
      date
    );

    // Step 2: Fetch the definitive record (whether just inserted or previously existing)
    const selectStmt = db.prepare(
      'SELECT * FROM expenses WHERE idempotency_key = ?'
    );
    const expense = selectStmt.get(idempotency_key) as ExpenseRow;

    // Step 3: Return 201 if newly created, 200 if duplicate key (idempotent replay)
    const statusCode = result.changes === 1 ? 201 : 200;
    res.status(statusCode).json(expense);
  } catch (err) {
    next(err);
  }
});

// GET /expenses — filter by category, always sort date DESC
router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const db = getDb();
    const { category } = req.query;

    // Build WHERE clause dynamically — filtering always in SQL, never JS
    const whereClause =
      typeof category === 'string' && category.trim()
        ? 'WHERE LOWER(category) = LOWER(?)'
        : '';

    const params: string[] =
      typeof category === 'string' && category.trim()
        ? [category.trim()]
        : [];

    // Always sort date DESC, created_at DESC for stable secondary sort
    const dataQuery = db.prepare(`
      SELECT * FROM expenses
      ${whereClause}
      ORDER BY date DESC, created_at DESC
    `);

    // Total computed in SQL so it is always accurate for the filtered set
    const totalQuery = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      ${whereClause}
    `);

    const expenses = dataQuery.all(...params) as ExpenseRow[];
    const totalRow = totalQuery.get(...params) as { total: number };

    res.json({
      expenses,
      total: totalRow.total,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
