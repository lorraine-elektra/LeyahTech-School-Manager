import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, enrolments, guardians, students } from '@/db/schema';
import type { SchoolClass } from '@/features/school/types';
import { compareBySurname } from './names';
import type { Enrolment, Guardian, Student } from './types';

export function isEnrolledOn(student: Pick<Student, 'admittedOn' | 'exitedOn'>, isoDate: string): boolean {
  return student.admittedOn <= isoDate && (!student.exitedOn || student.exitedOn > isoDate);
}

export async function classRoll(schoolId: string, classId: string): Promise<Student[]> {
  const rows = await db
    .select({ student: students })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(and(eq(enrolments.schoolId, schoolId), eq(enrolments.classId, classId)));
  return rows.map((r) => r.student).sort(compareBySurname);
}

export interface StudentListRow {
  student: Student;
  guardian: Guardian | null;
  schoolClass: SchoolClass | null;
}

// Each student with the class they are in for the given year, or their most recent class if they have left.
export async function listStudents(schoolId: string, academicYear: string, studentIds?: string[]): Promise<StudentListRow[]> {
  if (studentIds && studentIds.length === 0) return [];
  const studentRows = await db
    .select({ student: students, guardian: guardians })
    .from(students)
    .leftJoin(guardians, eq(guardians.id, students.guardianId))
    .where(studentIds ? and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)) : eq(students.schoolId, schoolId));
  const enrolmentRows = await db
    .select({ enrolment: enrolments, schoolClass: classes })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .where(eq(enrolments.schoolId, schoolId));

  const classByStudent = new Map<string, { enrolment: Enrolment; schoolClass: SchoolClass }>();
  for (const row of enrolmentRows) {
    const existing = classByStudent.get(row.enrolment.studentId);
    const isCurrent = row.enrolment.academicYear === academicYear;
    if (!existing || isCurrent || (existing.enrolment.academicYear !== academicYear && row.enrolment.academicYear > existing.enrolment.academicYear)) {
      classByStudent.set(row.enrolment.studentId, row);
    }
  }

  return studentRows
    .map(({ student, guardian }) => ({ student, guardian, schoolClass: classByStudent.get(student.id)?.schoolClass ?? null }))
    .sort((a, b) => compareBySurname(a.student, b.student));
}

export async function getStudentByAdmissionNo(schoolId: string, admissionNo: string) {
  const [row] = await db
    .select({ student: students, guardian: guardians })
    .from(students)
    .leftJoin(guardians, eq(guardians.id, students.guardianId))
    .where(and(eq(students.schoolId, schoolId), eq(students.admissionNo, admissionNo)));
  return row;
}

export async function studentEnrolments(schoolId: string, studentId: string) {
  return db
    .select({ enrolment: enrolments, schoolClass: classes })
    .from(enrolments)
    .innerJoin(classes, eq(classes.id, enrolments.classId))
    .where(and(eq(enrolments.schoolId, schoolId), eq(enrolments.studentId, studentId)))
    .orderBy(enrolments.academicYear);
}
