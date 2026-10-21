import 'server-only';
import { and, between, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendanceEntries, attendanceSheets } from '@/db/schema';
import type { Term } from '@/features/school/types';
import { addToTotals, emptyTotals } from './summary';
import type { AttendanceTotals } from './types';

export async function classTermTotals(schoolId: string, classIds: string[], term: Term): Promise<Map<string, AttendanceTotals>> {
  const totals = new Map<string, AttendanceTotals>();
  if (!classIds.length) return totals;
  const rows = await db
    .select({ classId: attendanceSheets.classId, status: attendanceEntries.status })
    .from(attendanceEntries)
    .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceEntries.sheetId))
    .where(and(eq(attendanceSheets.schoolId, schoolId), inArray(attendanceSheets.classId, classIds), between(attendanceSheets.date, term.startsOn, term.endsOn)));
  for (const row of rows) {
    if (!totals.has(row.classId)) totals.set(row.classId, emptyTotals());
    addToTotals(totals.get(row.classId)!, row.status);
  }
  return totals;
}
