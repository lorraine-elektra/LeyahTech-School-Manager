import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// Each server instance keeps a small pool. Behind a pooler such as PgBouncer or Neon's pooled URL,
// set DATABASE_POOLED=true, because transaction pooling cannot keep prepared statements.
const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: process.env.DATABASE_POOLED !== 'true',
  });
if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Database = typeof db;
