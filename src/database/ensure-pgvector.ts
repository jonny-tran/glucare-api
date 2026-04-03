/**
 * Kiểu SQL `vector(...)` chỉ tồn tại sau khi cài extension pgvector.
 * Chạy script này trước `drizzle-kit push` (đã gắn trong `pnpm db:push`).
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    ssl: true,
    max: 1,
  });
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('[pgvector] Extension "vector" is ready.');
  } catch (e) {
    console.error('[pgvector] CREATE EXTENSION failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
