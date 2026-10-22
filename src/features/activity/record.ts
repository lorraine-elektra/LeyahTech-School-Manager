import 'server-only';
import { db } from '@/db/client';
import { activityLog } from '@/db/schema';
import type { Viewer } from '@/features/auth/session';
import { staffName } from '@/features/staff/names';

export type ActivityArea = (typeof activityLog.$inferInsert)['area'];

type Executor = Pick<typeof db, 'insert'>;

export async function recordActivity(viewer: Viewer, area: ActivityArea, action: string, link?: string, executor: Executor = db) {
  await executor.insert(activityLog).values({
    schoolId: viewer.school.id,
    userId: viewer.userId,
    actorName: viewer.staff ? staffName(viewer.staff) : `${viewer.guardian?.title ?? ''} ${viewer.guardian?.name ?? viewer.username}`.trim(),
    area,
    action,
    link: link ?? null,
  });
}

export const activityAreas: ActivityArea[] = ['Students', 'Attendance', 'Scores', 'Reports', 'Fees', 'Promotion', 'Staff', 'Settings'];
