import { and, between, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { feePayments, students } from '@/db/schema';
import { canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { feeStanding } from '@/features/fees/accounts';
import { filterFeeAccounts } from '@/features/fees/filters';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { termLabel, todayIso } from '@/features/school/calendar';
import { visibleStudentIds } from '@/features/students/access';
import { studentFullName } from '@/features/students/names';
import { searchStudents } from '@/features/students/queries';
import type { StudentStatus } from '@/features/students/types';
import { csvResponse, toCsv } from '@/lib/csv';

const EXPORT_LIMIT = 20000;

export async function GET(request: Request, { params }: { params: Promise<{ school: string; kind: string }> }) {
  const { school, kind } = await params;
  const viewer = await requireViewer(school);
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const stamp = todayIso();

  if (kind === 'students' && viewer.role !== 'parent' && viewer.role !== 'subjectTeacher') {
    const scope = await visibleStudentIds(viewer);
    const { rows } = await searchStudents(viewer.school.id, viewer.currentTerm.academicYear, {
      q: query.q,
      classId: query.class || undefined,
      status: (query.status as StudentStatus | 'all') || 'Active',
      ids: scope === 'all' ? undefined : scope,
      limit: EXPORT_LIMIT,
      offset: 0,
    });
    const csv = toCsv(
      ['Admission no.', 'Surname', 'First name', 'Other names', 'Sex', 'Date of birth', 'Class', 'Status', 'Admitted on', 'Guardian', 'Relationship', 'Guardian phone', 'Other phone', 'Residence'],
      rows.map(({ student, guardian, schoolClass }) => [
        student.admissionNo,
        student.surname,
        student.firstName,
        student.otherNames,
        student.gender,
        student.dateOfBirth,
        schoolClass?.name,
        student.status,
        student.admittedOn,
        guardian ? `${guardian.title} ${guardian.name}` : '',
        guardian?.relationship,
        guardian?.phone,
        guardian?.altPhone,
        guardian?.residence,
      ]),
    );
    return csvResponse(`students-${stamp}.csv`, csv);
  }

  if (kind === 'fee-accounts' && canViewFees(viewer) && isOfficeStaff(viewer)) {
    const term = viewer.terms.find((t) => t.id === query.term) ?? viewer.currentTerm;
    const rows = filterFeeAccounts(await schoolFeeAccounts(viewer, term.id), query);
    const csv = toCsv(
      ['Admission no.', 'Student', 'Class', 'Status', 'Arrears b/f', 'Term fees', 'Scholarship', 'Paid', 'Balance', 'Standing'],
      rows.map(({ student, schoolClass, account }) => [
        student.admissionNo,
        studentFullName(student),
        schoolClass?.name,
        student.status,
        account.arrearsBroughtForward.toFixed(2),
        account.chargesTotal.toFixed(2),
        account.discountTotal.toFixed(2),
        account.paid.toFixed(2),
        account.balance.toFixed(2),
        feeStanding(account),
      ]),
    );
    return csvResponse(`fee-accounts-${termLabel(term).replace(/[ /]+/g, '-').toLowerCase()}.csv`, csv);
  }

  if (kind === 'receipts' && canViewFees(viewer) && isOfficeStaff(viewer)) {
    const from = query.from || viewer.currentTerm.startsOn;
    const to = query.to || stamp;
    const rows = await db
      .select({ payment: feePayments, student: students })
      .from(feePayments)
      .innerJoin(students, eq(students.id, feePayments.studentId))
      .where(and(eq(feePayments.schoolId, viewer.school.id), between(feePayments.paidOn, from, to)))
      .orderBy(desc(feePayments.paidOn), desc(feePayments.receiptNo))
      .limit(EXPORT_LIMIT);
    const csv = toCsv(
      ['Receipt no.', 'Date', 'Admission no.', 'Student', 'Amount', 'Method', 'Reference', 'Paid by', 'Voided on', 'Void reason'],
      rows.map(({ payment, student }) => [
        payment.receiptNo,
        payment.paidOn,
        student.admissionNo,
        studentFullName(student),
        payment.amount.toFixed(2),
        payment.method,
        payment.reference,
        payment.paidBy,
        payment.voidedOn,
        payment.voidReason,
      ]),
    );
    return csvResponse(`receipts-${from}-to-${to}.csv`, csv);
  }

  return new Response('This export does not exist or is not available to your account.', { status: 404 });
}
