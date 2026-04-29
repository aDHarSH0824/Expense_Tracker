import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import expensesRouter from './routes/expenses';
import { errorHandler } from './middleware/errors';

const app = express();

// Middleware stack — exact order matters
// 1. helmet must be first for security headers
app.use(helmet());

// 2. CORS — origin from env, never wildcard in production
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// 3. Request logging
app.use(morgan('combined'));

// 4. JSON body parsing with size limit
app.use(express.json({ limit: '10kb' }));

// 5. Routes
app.use('/expenses', expensesRouter);

// 6. 404 handler — catch-all for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 7. Centralized error handler — must have 4 params
app.use(errorHandler);

export default app;