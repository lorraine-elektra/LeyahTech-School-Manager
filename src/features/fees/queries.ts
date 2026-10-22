import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/db/client';
import { classes, enrolments, feeItems, feePayments, openingBalances, scholarships, students } from '@/db/schema';
import type { Viewer } from '@/features/auth/session';
import type { SchoolClass } from '@/features/school/types';
import type { Student } from '@/features/students/types';
import { termFeeAccount, feeAccountHistory, type FeeLedgerInput, type TermFeeAccount } from './accounts';

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const group = groups.get(k);
    if (group) group.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

interface FeeContext {
  students: Student[];
  classes: SchoolClass[];
  ledgerFor(student: Student): FeeLedgerInput;
}

async function loadFeeContext(viewer: Viewer, studentIds?: string[]): Promise<FeeContext> {
  const schoolId = viewer.school.id;
  const byStudents = (column: AnyPgColumn) => (studentIds ? inArray(column, studentIds) : undefined);
  const [studentRows, classRows, enrolmentRows, itemRows, scholarshipRows, paymentRows, balanceRows] = await Promise.all([
    db.select().from(students).where(and(eq(students.schoolId, schoolId), byStudents(students.id))),
    db.select().from(classes).where(eq(classes.schoolId, schoolId)),
    db.select().from(enrolments).where(and(eq(enrolments.schoolId, schoolId), byStudents(enrolments.studentId))),
    db.select().from(feeItems).where(eq(feeItems.schoolId, schoolId)),
    db.select().from(scholarships).where(and(eq(scholarships.schoolId, schoolId), byStudents(scholarships.studentId))),
    db.select().from(feePayments).where(and(eq(feePayments.schoolId, schoolId), byStudents(feePayments.studentId))),
    db.select().from(openingBalances).where(and(eq(openingBalances.schoolId, schoolId), byStudents(openingBalances.studentId))),
  ]);
  const enrolmentsByStudent = groupBy(enrolmentRows, (r) => r.studentId);
  const scholarshipsByStudent = groupBy(scholarshipRows, (r) => r.studentId);
  const paymentsByStudent = groupBy(paymentRows, (r) => r.studentId);
  const balanceByStudent = new Map(balanceRows.map((b) => [b.studentId, b.amount]));

  return {
    students: studentRows,
    classes: classRows,
    ledgerFor: (student) => ({
      student,
      terms: viewer.terms,
      classes: classRows,
      enrolments: enrolmentsByStudent.get(student.id) ?? [],
      feeItems: itemRows,
      scholarships: scholarshipsByStudent.get(student.id) ?? [],
      payments: paymentsByStudent.get(student.id) ?? [],
      openingBalance: balanceByStudent.get(student.id) ?? 0,
    }),
  };
}

export interface FeeAccountRow {
  student: Student;
  schoolClass?: SchoolClass;
  account: TermFeeAccount;
}

export async function schoolFeeAccounts(viewer: Viewer, termId = viewer.currentTerm.id, studentIds?: string[]): Promise<FeeAccountRow[]> {
  const context = await loadFeeContext(viewer, studentIds);
  const term = viewer.terms.find((t) => t.id === termId)!;
  return context.students.flatMap((student) => {
    const ledger = context.ledgerFor(student);
    const account = termFeeAccount(ledger, termId);
    if (!account) return [];
    const enrolment = ledger.enrolments.find((e) => e.academicYear === term.academicYear) ?? ledger.enrolments.at(-1);
    return [{ student, account, schoolClass: context.classes.find((c) => c.id === enrolment?.classId) }];
  });
}

export async function studentFeeHistory(viewer: Viewer, student: Student): Promise<TermFeeAccount[]> {
  const context = await loadFeeContext(viewer, [student.id]);
  return feeAccountHistory(context.ledgerFor(student), viewer.currentTerm.id);
}

export async function recentPayments(viewer: Viewer, limit: number, onDate?: string) {
  return db
    .select({ payment: feePayments, student: students })
    .from(feePayments)
    .innerJoin(students, eq(students.id, feePayments.studentId))
    .where(and(eq(feePayments.schoolId, viewer.school.id), onDate ? eq(feePayments.paidOn, onDate) : undefined))
    .orderBy(desc(feePayments.paidOn), desc(feePayments.receiptNo))
    .limit(limit);
}
