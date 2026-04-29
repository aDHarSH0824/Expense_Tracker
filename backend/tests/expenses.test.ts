import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import supertest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { initDb, getDb } from '../src/db';
import app from '../src/app';

// Use a temp file DB for tests — isolated from dev DB
const TEST_DB_PATH = path.join(os.tmpdir(), `expense-tracker-test-${Date.now()}.db`);

// Set CORS_ORIGIN so app doesn't break on startup
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// Initialize the DB once for all tests
initDb(TEST_DB_PATH);

const request = supertest(app);

// Reset the expenses table before each test
beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM expenses').run();
});

afterAll(() => {
  // Clean up temp DB file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// ─── Test 1: POST happy path ───────────────────────────────────────────────────
describe('POST /expenses', () => {
  it('creates an expense and returns 201 with correct fields', async () => {
    const body = {
      amount: '150.75',
      category: 'Food',
      description: 'Dinner at restaurant',
      date: '2024-01-15',
      idempotency_key: uuidv4(),
    };

    const res = await request.post('/expenses').send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      category: 'Food',
      description: 'Dinner at restaurant',
      date: '2024-01-15',
    });
    // amount must be stored as integer paise
    expect(res.body.amount).toBe(15075);
    // id must be a UUID string
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    // date must be YYYY-MM-DD string
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ─── Test 2: POST idempotency ─────────────────────────────────────────────────
  it('returns 200 on duplicate idempotency_key and creates exactly one DB row', async () => {
    const key = uuidv4();
    const body = {
      amount: '99.00',
      category: 'Transport',
      description: 'Cab fare',
      date: '2024-01-16',
      idempotency_key: key,
    };

    const firstRes = await request.post('/expenses').send(body);
    expect(firstRes.status).toBe(201);

    const secondRes = await request.post('/expenses').send(body);
    expect(secondRes.status).toBe(200);

    // Both responses should return the same record
    expect(secondRes.body.id).toBe(firstRes.body.id);

    // Query DB directly — must have exactly one row with this key
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM expenses WHERE idempotency_key = ?')
      .all(key);
    expect(rows).toHaveLength(1);
  });

  // ─── Test 3: POST validation failure ─────────────────────────────────────────
  it('returns 400 with field-level error when amount is negative', async () => {
    const body = {
      amount: '-50',
      category: 'Food',
      description: 'Something',
      date: '2024-01-15',
      idempotency_key: uuidv4(),
    };

    const res = await request.post('/expenses').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    const amountError = res.body.errors.find(
      (e: { field: string; message: string }) => e.field === 'amount'
    );
    expect(amountError).toBeDefined();
    expect(amountError.field).toBe('amount');
  });
});

// ─── Test 4: GET category filter ─────────────────────────────────────────────
describe('GET /expenses', () => {
  it('returns only filtered expenses and correct total for ?category=Food', async () => {
    // Insert Food expense: ₹100.00 = 10000 paise
    await request.post('/expenses').send({
      amount: '100.00',
      category: 'Food',
      description: 'Lunch',
      date: '2024-01-15',
      idempotency_key: uuidv4(),
    });

    // Insert Transport expense: ₹50.00 = 5000 paise
    await request.post('/expenses').send({
      amount: '50.00',
      category: 'Transport',
      description: 'Bus ticket',
      date: '2024-01-16',
      idempotency_key: uuidv4(),
    });

    const res = await request.get('/expenses?category=Food');

    expect(res.status).toBe(200);
    expect(res.body.expenses).toHaveLength(1);
    expect(res.body.expenses[0].category).toBe('Food');
    // total must equal only the Food expense's amount in paise
    expect(res.body.total).toBe(10000);
  });
});
