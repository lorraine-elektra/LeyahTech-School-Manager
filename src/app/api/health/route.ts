import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export const dynamic = 'force-dynamic';

// For uptime checks and load balancers: 200 when the app can reach the database.
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok', databaseMs: Date.now() - started });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
