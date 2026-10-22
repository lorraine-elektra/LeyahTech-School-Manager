import 'server-only';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { activityLog } from '@/db/schema';
import type { ActivityArea } from './record';

export type ActivityEntry = typeof activityLog.$inferSelect;

export async function activityPage(schoolId: string, options: { area?: ActivityArea; limit: number; offset?: number }) {
  const where = and(eq(activityLog.schoolId, schoolId), options.area ? eq(activityLog.area, options.area) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(activityLog).where(where).orderBy(desc(activityLog.at)).limit(options.limit).offset(options.offset ?? 0),
    db.select({ total: count() }).from(activityLog).where(where),
  ]);
  return { rows, total };
}
