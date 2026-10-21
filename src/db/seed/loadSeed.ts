import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { hashPassword } from '@/features/auth/password';
import type { Database } from '../client';
import * as schema from '../schema';
import { SEED_SCHOOL_ID, type SeedDataset } from './dataset';

const CHUNK_SIZE = 1000;

async function insertRows<T extends PgTable>(db: Database, table: T, rows: T['$inferInsert'][]) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await db.insert(table).values(rows.slice(i, i + CHUNK_SIZE));
  }
}

export async function deleteSchool(db: Database, slug: string) {
  const [school] = await db.select().from(schema.schools).where(eq(schema.schools.slug, slug));
  if (!school) return;
  const bySchool = (table: PgTable & { schoolId: AnyPgColumn }) =>
    db.delete(table).where(eq(table.schoolId, school.id));

  const sheetIds = db.select({ id: schema.attendanceSheets.id }).from(schema.attendanceSheets).where(eq(schema.attendanceSheets.schoolId, school.id));
  await db.delete(schema.attendanceEntries).where(inArray(schema.attendanceEntries.sheetId, sheetIds));
  const userIds = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.schoolId, school.id));
  await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
  for (const table of [
    schema.attendanceSheets,
    schema.attendanceSummaries,
    schema.subjectScores,
    schema.reportRemarks,
    schema.feePayments,
    schema.scholarships,
    schema.openingBalances,
    schema.receiptCounters,
    schema.feeItems,
    schema.studentMovements,
    schema.enrolments,
    schema.teachingAssignments,
    schema.users,
    schema.students,
    schema.guardians,
    schema.classes,
    schema.subjects,
  ]) {
    await bySchool(table);
  }
  await db.update(schema.schools).set({ currentTermId: null }).where(eq(schema.schools.id, school.id));
  await bySchool(schema.terms);
  await bySchool(schema.staff);
  await db.delete(schema.schools).where(eq(schema.schools.id, school.id));
}

export async function loadSeed(db: Database, dataset: SeedDataset) {
  const ids = new Map<string, string>();
  const id = (localId: string) => {
    if (!ids.has(localId)) ids.set(localId, randomUUID());
    return ids.get(localId)!;
  };
  const optionalId = (localId: string | null) => (localId === null ? null : id(localId));

  const [school] = await db
    .insert(schema.schools)
    .values({ ...dataset.school, currentTermId: null })
    .returning();
  const schoolId = school.id;
  ids.set(SEED_SCHOOL_ID, schoolId);

  await insertRows(db, schema.terms, dataset.terms.map((t) => ({ ...t, id: id(t.id), schoolId })));
  await db.update(schema.schools).set({ currentTermId: id(dataset.school.currentTermId!) }).where(eq(schema.schools.id, schoolId));
  await insertRows(db, schema.staff, dataset.staff.map((s) => ({ ...s, id: id(s.id), schoolId })));
  await insertRows(db, schema.subjects, dataset.subjects.map((s) => ({ ...s, id: id(s.id), schoolId })));
  await insertRows(db, schema.guardians, dataset.guardians.map((g) => ({ ...g, id: id(g.id), schoolId })));

  const passwordHashes = new Map<string, string>();
  for (const account of dataset.accounts) {
    if (!passwordHashes.has(account.password)) passwordHashes.set(account.password, await hashPassword(account.password));
  }
  await insertRows(
    db,
    schema.users,
    dataset.accounts.map((a) => ({
      schoolId,
      username: a.username,
      passwordHash: passwordHashes.get(a.password)!,
      staffId: optionalId(a.staffId),
      guardianId: optionalId(a.guardianId),
    })),
  );

  await insertRows(db, schema.classes, dataset.classes.map((c) => ({ ...c, id: id(c.id), schoolId, classTeacherId: optionalId(c.classTeacherId) })));
  await insertRows(
    db,
    schema.teachingAssignments,
    dataset.teachingAssignments.map((a) => ({ schoolId, classId: id(a.classId), subjectId: id(a.subjectId), teacherId: id(a.teacherId) })),
  );
  await insertRows(db, schema.students, dataset.students.map((s) => ({ ...s, id: id(s.id), schoolId, guardianId: optionalId(s.guardianId) })));
  await insertRows(db, schema.enrolments, dataset.enrolments.map((e) => ({ ...e, schoolId, studentId: id(e.studentId), classId: id(e.classId) })));
  await insertRows(
    db,
    schema.studentMovements,
    dataset.movements.map((m) => ({ ...m, id: id(m.id), schoolId, studentId: id(m.studentId), recordedBy: optionalId(m.recordedBy) })),
  );
  await insertRows(
    db,
    schema.attendanceSheets,
    dataset.attendanceSheets.map((s) => ({ ...s, id: id(s.id), schoolId, classId: id(s.classId), markedBy: optionalId(s.markedBy) })),
  );
  await insertRows(db, schema.attendanceEntries, dataset.attendanceEntries.map((e) => ({ ...e, sheetId: id(e.sheetId), studentId: id(e.studentId) })));
  await insertRows(
    db,
    schema.attendanceSummaries,
    dataset.attendanceSummaries.map((s) => ({ ...s, schoolId, termId: id(s.termId), studentId: id(s.studentId) })),
  );
  await insertRows(
    db,
    schema.subjectScores,
    dataset.scores.map((s) => ({ ...s, schoolId, termId: id(s.termId), studentId: id(s.studentId), subjectId: id(s.subjectId), updatedBy: null })),
  );
  await insertRows(db, schema.reportRemarks, dataset.reportRemarks.map((r) => ({ ...r, schoolId, termId: id(r.termId), studentId: id(r.studentId) })));
  await insertRows(db, schema.feeItems, dataset.feeItems.map((f) => ({ ...f, id: id(f.id), schoolId, termId: id(f.termId) })));
  await insertRows(
    db,
    schema.scholarships,
    dataset.scholarships.map((s) => ({
      ...s,
      id: id(s.id),
      schoolId,
      studentId: id(s.studentId),
      fromTermId: id(s.fromTermId),
      toTermId: optionalId(s.toTermId),
      approvedBy: optionalId(s.approvedBy),
    })),
  );
  await insertRows(
    db,
    schema.feePayments,
    dataset.payments.map((p) => ({
      ...p,
      id: id(p.id),
      schoolId,
      studentId: id(p.studentId),
      termId: id(p.termId),
      receivedBy: optionalId(p.receivedBy),
      voidedBy: optionalId(p.voidedBy),
    })),
  );
  await insertRows(db, schema.openingBalances, dataset.openingBalances.map((b) => ({ ...b, schoolId, studentId: id(b.studentId) })));

  const lastReceipts = new Map<number, number>();
  for (const payment of dataset.payments) {
    const [, year, sequence] = payment.receiptNo.split('/');
    lastReceipts.set(Number(year), Math.max(lastReceipts.get(Number(year)) ?? 0, Number(sequence)));
  }
  await insertRows(db, schema.receiptCounters, [...lastReceipts].map(([year, lastNumber]) => ({ schoolId, year, lastNumber })));
  return school;
}
