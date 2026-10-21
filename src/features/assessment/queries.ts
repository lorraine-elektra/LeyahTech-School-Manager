import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { reportRemarks, subjectScores } from '@/db/schema';

export async function termScores(schoolId: string, termId: string, studentIds: string[]) {
  if (!studentIds.length) return [];
  return db
    .select()
    .from(subjectScores)
    .where(and(eq(subjectScores.schoolId, schoolId), eq(subjectScores.termId, termId), inArray(subjectScores.studentId, studentIds)));
}

export async function termRemarks(schoolId: string, termId: string, studentIds: string[]) {
  if (!studentIds.length) return [];
  return db
    .select()
    .from(reportRemarks)
    .where(and(eq(reportRemarks.schoolId, schoolId), eq(reportRemarks.termId, termId), inArray(reportRemarks.studentId, studentIds)));
}
