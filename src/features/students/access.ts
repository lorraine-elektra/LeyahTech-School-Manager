import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { enrolments, students } from '@/db/schema';
import { teachingClassIds } from '@/features/auth/permissions';
import type { Viewer } from '@/features/auth/session';

// Office staff see every student; teachers see the classes they teach this year; parents see their own children.
export async function visibleStudentIds(viewer: Viewer): Promise<'all' | string[]> {
  if (viewer.role === 'headteacher' || viewer.role === 'bursar') return 'all';
  if (viewer.role === 'parent') {
    if (!viewer.guardian) return [];
    const rows = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.schoolId, viewer.school.id), eq(students.guardianId, viewer.guardian.id)));
    return rows.map((r) => r.id);
  }
  const classIds = teachingClassIds(viewer);
  if (classIds.length === 0) return [];
  const rows = await db
    .select({ id: enrolments.studentId })
    .from(enrolments)
    .where(and(eq(enrolments.schoolId, viewer.school.id), inArray(enrolments.classId, classIds)));
  return [...new Set(rows.map((r) => r.id))];
}

export async function canViewStudent(viewer: Viewer, studentId: string): Promise<boolean> {
  const scope = await visibleStudentIds(viewer);
  return scope === 'all' || scope.includes(studentId);
}
