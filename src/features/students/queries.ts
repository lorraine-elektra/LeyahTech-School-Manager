import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
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

export interface StudentSearch {
  q?: string;
  classId?: string;
  status?: Student['status'] | 'all';
  ids?: string[];
  limit: number;
  offset: number;
}

// Filtering and paging happen in the database, so a page costs the same for 300 students or 3,000.
export async function searchStudents(schoolId: string, academicYear: string, search: StudentSearch): Promise<{ rows: StudentListRow[]; total: number }> {
  if (search.ids && search.ids.length === 0) return { rows: [], total: 0 };
  const conditions: (SQL | undefined)[] = [
    eq(students.schoolId, schoolId),
    search.status && search.status !== 'all' ? eq(students.status, search.status) : undefined,
    search.classId ? eq(enrolments.classId, search.classId) : undefined,
    search.ids ? inArray(students.id, search.ids) : undefined,
  ];
  const q = search.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const digits = q.replace(/\D/g, '');
    conditions.push(
      or(
        ilike(sql`${students.firstName} || ' ' || coalesce(${students.otherNames}, '') || ' ' || ${students.surname}`, pattern),
        ilike(sql`${students.surname} || ' ' || ${students.firstName}`, pattern),
        ilike(students.admissionNo, pattern),
        ilike(guardians.name, pattern),
        digits.length >= 4 ? ilike(sql`replace(${guardians.phone}, ' ', '')`, `%${digits}%`) : undefined,
      ),
    );
  }
  const where = and(...conditions);
  const base = () =>
    db
      .select({ student: students, guardian: guardians, schoolClass: classes })
      .from(students)
      .leftJoin(guardians, eq(guardians.id, students.guardianId))
      .leftJoin(enrolments, and(eq(enrolments.studentId, students.id), eq(enrolments.academicYear, academicYear)))
      .leftJoin(classes, eq(classes.id, enrolments.classId));
  const [rows, [{ total }]] = await Promise.all([
    base().where(where).orderBy(asc(students.surname), asc(students.firstName), asc(students.admissionNo)).limit(search.limit).offset(search.offset),
    db
      .select({ total: count() })
      .from(students)
      .leftJoin(guardians, eq(guardians.id, students.guardianId))
      .leftJoin(enrolments, and(eq(enrolments.studentId, students.id), eq(enrolments.academicYear, academicYear)))
      .where(where),
  ]);

  // Students who have left have no class this year, so show the last class they were in.
  const missing = rows.filter((r) => !r.schoolClass).map((r) => r.student.id);
  const lastClass = new Map<string, SchoolClass>();
  if (missing.length) {
    const previous = await db
      .select({ studentId: enrolments.studentId, schoolClass: classes })
      .from(enrolments)
      .innerJoin(classes, eq(classes.id, enrolments.classId))
      .where(inArray(enrolments.studentId, missing))
      .orderBy(desc(enrolments.academicYear));
    for (const row of previous) if (!lastClass.has(row.studentId)) lastClass.set(row.studentId, row.schoolClass);
  }
  return { rows: rows.map((r) => ({ ...r, schoolClass: r.schoolClass ?? lastClass.get(r.student.id) ?? null })), total };
}

export async function activeRollCounts(schoolId: string, academicYear: string, onDate: string): Promise<Map<string, number>> {
  const byGender = await activeRollByGender(schoolId, academicYear, onDate);
  return new Map([...byGender].map(([classId, c]) => [classId, c.M + c.F]));
}

export async function activeRollByGender(schoolId: string, academicYear: string, onDate: string): Promise<Map<string, { M: number; F: number }>> {
  const rows = await db
    .select({ classId: enrolments.classId, gender: students.gender, students: count() })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(
      and(
        eq(enrolments.schoolId, schoolId),
        eq(enrolments.academicYear, academicYear),
        sql`${students.admittedOn} <= ${onDate}`,
        or(sql`${students.exitedOn} is null`, sql`${students.exitedOn} > ${onDate}`),
      ),
    )
    .groupBy(enrolments.classId, students.gender);
  const counts = new Map<string, { M: number; F: number }>();
  for (const row of rows) {
    const entry = counts.get(row.classId) ?? { M: 0, F: 0 };
    entry[row.gender] = row.students;
    counts.set(row.classId, entry);
  }
  return counts;
}
