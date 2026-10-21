import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, staff, subjects } from '@/db/schema';
import type { SchoolClass, Subject } from './types';

export async function getClasses(schoolId: string, academicYear?: string): Promise<SchoolClass[]> {
  return db
    .select()
    .from(classes)
    .where(academicYear ? and(eq(classes.schoolId, schoolId), eq(classes.academicYear, academicYear)) : eq(classes.schoolId, schoolId))
    .orderBy(asc(classes.yearGroup), asc(classes.name));
}

export async function getClass(schoolId: string, classId: string): Promise<SchoolClass | undefined> {
  if (!/^[0-9a-f-]{36}$/.test(classId)) return undefined;
  const [schoolClass] = await db.select().from(classes).where(and(eq(classes.schoolId, schoolId), eq(classes.id, classId)));
  return schoolClass;
}

export async function getSubjects(schoolId: string): Promise<Subject[]> {
  return db.select().from(subjects).where(eq(subjects.schoolId, schoolId)).orderBy(asc(subjects.sortOrder));
}

export async function getStaff(schoolId: string) {
  return db.select().from(staff).where(eq(staff.schoolId, schoolId)).orderBy(asc(staff.surname));
}
