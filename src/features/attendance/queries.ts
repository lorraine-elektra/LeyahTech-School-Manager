import 'server-only';
import { and, between, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendanceEntries, attendanceSheets, attendanceSummaries } from '@/db/schema';
import type { Term } from '@/features/school/types';
import { addToTotals, emptyTotals } from './summary';
import type { AttendanceEntry, AttendanceSheet, AttendanceTotals } from './types';

export async function sheetsOnDate(schoolId: string, date: string): Promise<(AttendanceSheet & { entries: AttendanceEntry[] })[]> {
  const sheets = await db.select().from(attendanceSheets).where(and(eq(attendanceSheets.schoolId, schoolId), eq(attendanceSheets.date, date)));
  if (!sheets.length) return [];
  const entries = await db.select().from(attendanceEntries).where(inArray(attendanceEntries.sheetId, sheets.map((s) => s.id)));
  return sheets.map((sheet) => ({ ...sheet, entries: entries.filter((e) => e.sheetId === sheet.id) }));
}

export async function classSheet(schoolId: string, classId: string, date: string) {
  const [sheet] = await db
    .select()
    .from(attendanceSheets)
    .where(and(eq(attendanceSheets.schoolId, schoolId), eq(attendanceSheets.classId, classId), eq(attendanceSheets.date, date)));
  if (!sheet) return undefined;
  const entries = await db.select().from(attendanceEntries).where(eq(attendanceEntries.sheetId, sheet.id));
  return { ...sheet, entries };
}

export async function classSheetsInTerm(schoolId: string, classId: string, term: Term) {
  const sheets = await db
    .select()
    .from(attendanceSheets)
    .where(and(eq(attendanceSheets.schoolId, schoolId), eq(attendanceSheets.classId, classId), between(attendanceSheets.date, term.startsOn, term.endsOn)))
    .orderBy(attendanceSheets.date);
  const entries = sheets.length ? await db.select().from(attendanceEntries).where(inArray(attendanceEntries.sheetId, sheets.map((s) => s.id))) : [];
  return { sheets, entries };
}

// Totals per student for a term: stored summaries for closed terms, otherwise counted from daily sheets.
export async function termAttendanceTotals(schoolId: string, term: Term, studentIds: string[]): Promise<Map<string, AttendanceTotals>> {
  const totals = new Map<string, AttendanceTotals>();
  if (!studentIds.length) return totals;
  const summaries = await db
    .select()
    .from(attendanceSummaries)
    .where(and(eq(attendanceSummaries.termId, term.id), inArray(attendanceSummaries.studentId, studentIds)));
  for (const summary of summaries) totals.set(summary.studentId, summary);
  const missing = studentIds.filter((id) => !totals.has(id));
  if (!missing.length) return totals;

  const rows = await db
    .select({ studentId: attendanceEntries.studentId, status: attendanceEntries.status })
    .from(attendanceEntries)
    .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceEntries.sheetId))
    .where(
      and(
        eq(attendanceSheets.schoolId, schoolId),
        between(attendanceSheets.date, term.startsOn, term.endsOn),
        inArray(attendanceEntries.studentId, missing),
      ),
    );
  for (const row of rows) {
    if (!totals.has(row.studentId)) totals.set(row.studentId, emptyTotals());
    addToTotals(totals.get(row.studentId)!, row.status);
  }
  return totals;
}
