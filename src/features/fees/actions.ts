'use server';

import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { feePayments, receiptCounters, scholarships, students } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canManageFees, canRecordPayments } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { studentFullName } from '@/features/students/names';
import { slugToAdmissionNo } from '@/features/students/names';
import { schoolChanged } from '@/lib/revalidate';
import { formatMoney } from '@/ui/format';
import { roundMoney } from './accounts';
import { paymentMethods, type PaymentMethod } from './types';

export interface FormState {
  error?: string;
  values?: Record<string, string>;
}

const MAX_PAYMENT = 50_000;

export async function recordPayment(schoolSlug: string, studentId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canRecordPayments(viewer)) return { error: 'Only the bursar or accounts clerk can record payments.' };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));

  const amount = roundMoney(Number(values.amount?.replace(/,/g, '')));
  const method = values.method as PaymentMethod;
  const paidOn = values.paidOn;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter the amount paid in cedis, for example 850 or 1,262.50.', values };
  if (amount > MAX_PAYMENT) return { error: `Amounts above GH₵ ${MAX_PAYMENT.toLocaleString()} need to be split or checked with the headteacher first.`, values };
  if (!paymentMethods.includes(method)) return { error: 'Choose how the payment was made.', values };
  if (method !== 'Cash' && !values.reference) return { error: `Enter the ${method === 'Mobile Money' ? 'Mobile Money transaction ID' : method === 'Cheque' ? 'cheque number' : 'bank slip number'} so the payment can be traced.`, values };
  if (!values.paidBy) return { error: 'Enter the name of the person who paid.', values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > todayIso()) return { error: 'The payment date cannot be in the future.', values };

  const [student] = await db.select().from(students).where(and(eq(students.schoolId, viewer.school.id), eq(students.id, studentId)));
  if (!student) return { error: 'This student was not found. Go back and select the student again.', values };

  const payment = await db.transaction(async (tx) => {
    const year = Number(paidOn.slice(0, 4));
    // The counter row is locked by the upsert, so two cashiers cannot get the same receipt number.
    const [counter] = await tx
      .insert(receiptCounters)
      .values({ schoolId: viewer.school.id, year, lastNumber: 1 })
      .onConflictDoUpdate({ target: [receiptCounters.schoolId, receiptCounters.year], set: { lastNumber: sql`${receiptCounters.lastNumber} + 1` } })
      .returning();
    const [created] = await tx
      .insert(feePayments)
      .values({
        schoolId: viewer.school.id,
        receiptNo: `RCT/${year}/${String(counter.lastNumber).padStart(5, '0')}`,
        studentId: student.id,
        termId: viewer.currentTerm.id,
        amount,
        method,
        reference: values.reference || null,
        paidBy: values.paidBy,
        paidOn,
        receivedBy: viewer.staff?.id ?? null,
      })
      .returning();
    return created;
  });

  await recordActivity(viewer, 'Fees', `Recorded ${payment.receiptNo}, ${formatMoney(amount)} for ${studentFullName(student)} (${student.admissionNo})`, `/fees/receipts/${payment.id}`);
  schoolChanged(viewer);
  redirect(`/${schoolSlug}/fees/receipts/${payment.id}?recorded=1`);
}

export async function voidPayment(schoolSlug: string, paymentId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canRecordPayments(viewer)) return { error: 'Only the bursar or accounts clerk can void a receipt.' };
  const reason = String(formData.get('reason') ?? '').trim();
  if (reason.length < 8) return { error: 'Give the reason for voiding this receipt, for example "Duplicate entry of RCT/2026/00412".' };
  await db
    .update(feePayments)
    .set({ voidedOn: todayIso(), voidedBy: viewer.staff?.id ?? null, voidReason: reason })
    .where(and(eq(feePayments.schoolId, viewer.school.id), eq(feePayments.id, paymentId)));
  const [voided] = await db.select({ receiptNo: feePayments.receiptNo }).from(feePayments).where(eq(feePayments.id, paymentId));
  await recordActivity(viewer, 'Fees', `Voided ${voided?.receiptNo ?? 'a receipt'}: ${reason}`, `/fees/receipts/${paymentId}`);
  schoolChanged(viewer);
  return {};
}

export async function addScholarship(schoolSlug: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canManageFees(viewer)) return { error: 'Only the headteacher or bursar can add scholarships.' };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.schoolId, viewer.school.id), eq(students.admissionNo, slugToAdmissionNo(values.admissionNo.toUpperCase()))));
  if (!student) return { error: `No student has admission number ${values.admissionNo}. Check the number on the student list.`, values };
  const value = Number(values.value);
  const basis = values.basis === 'fixedPerTerm' ? 'fixedPerTerm' : 'percentOfTuition';
  if (!Number.isFinite(value) || value <= 0 || (basis === 'percentOfTuition' && value > 100)) {
    return { error: basis === 'percentOfTuition' ? 'Enter a percentage between 1 and 100.' : 'Enter the amount taken off each term in cedis.', values };
  }
  if (!values.name) return { error: 'Enter the name of the scholarship or discount.', values };
  const fromTerm = viewer.terms.find((t) => t.id === values.fromTermId);
  const toTerm = values.toTermId ? viewer.terms.find((t) => t.id === values.toTermId) : undefined;
  if (!fromTerm || (values.toTermId && (!toTerm || toTerm.startsOn < fromTerm.startsOn))) return { error: 'The last term must be the same as or after the first term.', values };

  await db.insert(scholarships).values({
    schoolId: viewer.school.id,
    studentId: student.id,
    name: values.name,
    basis,
    value,
    fromTermId: fromTerm.id,
    toTermId: toTerm?.id ?? null,
    approvedBy: viewer.staff?.id ?? null,
    notes: values.notes || null,
  });
  await recordActivity(viewer, 'Fees', `Added scholarship "${values.name}" for ${studentFullName(student)} (${student.admissionNo})`, '/fees/scholarships');
  schoolChanged(viewer);
  redirect(`/${schoolSlug}/fees/scholarships?added=1`);
}
