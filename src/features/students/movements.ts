import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { studentMovements, students } from '@/db/schema';

export async function recentMovements(schoolId: string, limit?: number, kind?: string) {
  const query = db
    .select({ movement: studentMovements, student: students })
    .from(studentMovements)
    .innerJoin(students, eq(students.id, studentMovements.studentId))
    .where(and(eq(studentMovements.schoolId, schoolId), kind ? eq(studentMovements.kind, kind as never) : undefined))
    .orderBy(desc(studentMovements.date), desc(students.admissionNo));
  return limit ? query.limit(limit) : query;
}
