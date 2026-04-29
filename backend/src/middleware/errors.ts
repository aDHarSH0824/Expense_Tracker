import { Request, Response, NextFunction } from 'express';

// Centralized error handler — must have exactly 4 params for Express to recognize it
// Never leaks stack traces to client in production
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Only log stack in non-production environments (morgan handles HTTP logging)
    console.error(err);
  }

  res.status(500).json({ error: 'Internal server error' });
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
