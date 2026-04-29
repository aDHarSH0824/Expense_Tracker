import 'dotenv/config';
import { initDb } from './db';
import app from './app';

// Validate required env vars on startup — crash with clear error if missing
const REQUIRED_ENV_VARS = ['DATABASE_PATH', 'CORS_ORIGIN'] as const;

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATABASE_PATH = process.env.DATABASE_PATH as string;

// Initialize DB singleton before starting server
initDb(DATABASE_PATH);

app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
  console.log(`[server] CORS origin: ${process.env.CORS_ORIGIN}`);
  console.log(`[server] Database: ${DATABASE_PATH}`);
});