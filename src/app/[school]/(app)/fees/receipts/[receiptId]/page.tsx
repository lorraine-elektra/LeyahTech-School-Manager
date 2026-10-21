import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { feePayments, staff, students } from '@/db/schema';
import { allow, canRecordPayments, canViewFees } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { voidPayment } from '@/features/fees/actions';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { VoidReceiptForm } from '@/features/fees/VoidReceiptForm';
import { termLabel } from '@/features/school/calendar';
import { staffName } from '@/features/staff/names';
import { canViewStudent } from '@/features/students/access';
import { studentFullName } from '@/features/students/names';
import { amountInWords, formatDate, formatMoney, formatBalance } from '@/ui/format';
import { PrintButton } from '@/ui/PrintButton';

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string; receiptId: string }>;
  searchParams: Promise<{ recorded?: string }>;
}) {
  const { school, receiptId } = await params;
  const { recorded } = await searchParams;
  const viewer = await requireViewer(school);
  allow(canViewFees(viewer));
  if (!/^[0-9a-f-]{36}$/.test(receiptId)) notFound();
  const [row] = await db
    .select({ payment: feePayments, student: students })
    .from(feePayments)
    .innerJoin(students, eq(students.id, feePayments.studentId))
    .where(and(eq(feePayments.schoolId, viewer.school.id), eq(feePayments.id, receiptId)));
  if (!row || !(await canViewStudent(viewer, row.student.id))) notFound();
  const { payment, student } = row;
  const staffIds = [payment.receivedBy, payment.voidedBy].filter((id): id is string => !!id);
  const people = staffIds.length ? await db.select().from(staff).where(eq(staff.schoolId, viewer.school.id)) : [];
  const [account] = await schoolFeeAccounts(viewer, viewer.currentTerm.id, [student.id]);
  const term = viewer.terms.find((t) => t.id === payment.termId)!;

  return (
    <>
      <div className="table-toolbar no-print">
        <Link className="button" href={`/${school}/fees/receipts`}>
          All receipts
        </Link>
        <PrintButton label="Print receipt" />
        {recorded && <span className="notice notice--success">Payment recorded. Receipt {payment.receiptNo} issued.</span>}
      </div>

      <article className="receipt">
        <header className="report-card__header">
          <div className="school-mark__crest" aria-hidden="true">
            {viewer.school.shortName}
          </div>
          <div>
            <div className="report-card__school">{viewer.school.name}</div>
            <div className="muted">{viewer.school.address}</div>
            <div className="muted">{viewer.school.phone}</div>
          </div>
          <div className="report-card__title">
            Official receipt
            <div className="mono">{payment.receiptNo}</div>
          </div>
        </header>
        {payment.voidedOn && (
          <p className="notice notice--error" style={{ marginTop: 12 }}>
            Void. Cancelled on {formatDate(payment.voidedOn)} by {staffName(people.find((p) => p.id === payment.voidedBy))}. {payment.voidReason}
          </p>
        )}
        <dl className="receipt__lines">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(payment.paidOn)}</dd>
          </div>
          <div>
            <dt>Received from</dt>
            <dd>{payment.paidBy}</dd>
          </div>
          <div>
            <dt>For student</dt>
            <dd>
              {studentFullName(student)} <span className="mono">({student.admissionNo})</span>
              {account?.schoolClass && `, ${account.schoolClass.name}`}
            </dd>
          </div>
          <div>
            <dt>Being</dt>
            <dd>School fees, {termLabel(term)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd className="receipt__amount">{formatMoney(payment.amount)}</dd>
          </div>
          <div>
            <dt>In words</dt>
            <dd>{amountInWords(payment.amount)}</dd>
          </div>
          <div>
            <dt>Paid by</dt>
            <dd>
              {payment.method}
              {payment.reference && <span className="mono"> · {payment.reference}</span>}
            </dd>
          </div>
          <div>
            <dt>Balance on account</dt>
            <dd className="mono">{account ? formatBalance(account.account.balance) : formatMoney(0)}</dd>
          </div>
        </dl>
        <div className="report-card__signature" style={{ marginLeft: 0 }}>
          Received by {staffName(people.find((p) => p.id === payment.receivedBy))}
        </div>
      </article>

      {canRecordPayments(viewer) && !payment.voidedOn && <VoidReceiptForm action={voidPayment.bind(null, school, payment.id)} />}
    </>
  );
}
