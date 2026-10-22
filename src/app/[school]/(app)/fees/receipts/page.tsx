import { and, between, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db/client';
import { feePayments, students } from '@/db/schema';
import { allow, canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { sumMoney } from '@/features/fees/accounts';
import { paymentMethods } from '@/features/fees/types';
import { todayIso } from '@/features/school/calendar';
import { studentFullName, studentRegisterName } from '@/features/students/names';
import { EmptyState } from '@/ui/EmptyState';
import { FilterBar } from '@/ui/FilterBar';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { PAGE_SIZE, pageFrom, Pagination } from '@/ui/Pagination';
import { Tag } from '@/ui/Tag';
import { formatDate, formatMoney } from '@/ui/format';

export default async function ReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ from?: string; to?: string; method?: string; q?: string; page?: string }>;
}) {
  const { school } = await params;
  const filters = await searchParams;
  const viewer = await requireViewer(school);
  allow(canViewFees(viewer) && isOfficeStaff(viewer));
  const from = filters.from || viewer.currentTerm.startsOn;
  const to = filters.to || todayIso();
  const query = filters.q?.trim().toLowerCase();

  const rows = (
    await db
      .select({ payment: feePayments, student: students })
      .from(feePayments)
      .innerJoin(students, eq(students.id, feePayments.studentId))
      .where(and(eq(feePayments.schoolId, viewer.school.id), between(feePayments.paidOn, from, to)))
      .orderBy(desc(feePayments.paidOn), desc(feePayments.receiptNo))
  ).filter(
    ({ payment, student }) =>
      (!filters.method || payment.method === filters.method) &&
      (!query ||
        payment.receiptNo.toLowerCase().includes(query) ||
        studentFullName(student).toLowerCase().includes(query) ||
        payment.paidBy.toLowerCase().includes(query) ||
        payment.reference?.toLowerCase().includes(query)),
  );
  const valid = rows.filter((r) => !r.payment.voidedOn);
  const page = pageFrom(filters.page);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const byMethod = paymentMethods
    .map((method) => ({ method, rows: valid.filter((r) => r.payment.method === method) }))
    .filter((group) => group.rows.length);

  return (
    <>
      <PageHeader
        title="Receipts"
        meta={`${formatDate(from)} to ${formatDate(to)}`}
        actions={
          <a className="button" href={`/${school}/exports/receipts?from=${from}&to=${to}`}>
            <Icon name="download" /> Export CSV
          </a>
        }
      />
      <FilterBar count={`${valid.length} receipts · ${formatMoney(sumMoney(valid, (r) => r.payment.amount))}`}>
        <label className="field">
          <span>From</span>
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" name="to" defaultValue={to} />
        </label>
        <label className="field">
          <span>Method</span>
          <select name="method" defaultValue={filters.method ?? ''}>
            <option value="">All methods</option>
            {paymentMethods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Search</span>
          <input name="q" defaultValue={filters.q} placeholder="Receipt, student, payer or reference" style={{ width: 240 }} />
        </label>
      </FilterBar>

      {byMethod.length > 0 && (
        <dl className="key-figures" style={{ marginBottom: 12 }}>
          {byMethod.map(({ method, rows: methodRows }) => (
            <div key={method}>
              <dt>
                {method} ({methodRows.length})
              </dt>
              <dd>{formatMoney(sumMoney(methodRows, (r) => r.payment.amount))}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <EmptyState icon="receipt">No payments recorded between these dates.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Student</th>
                <th>Paid by</th>
                <th>Method</th>
                <th>Reference</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ payment, student }) => (
                <tr key={payment.id} className={payment.voidedOn ? 'row-muted' : undefined}>
                  <td className="mono nowrap">
                    <Link href={`/${school}/fees/receipts/${payment.id}`}>{payment.receiptNo}</Link>
                  </td>
                  <td className="nowrap">{formatDate(payment.paidOn)}</td>
                  <td className="nowrap">{studentRegisterName(student)}</td>
                  <td>{payment.paidBy}</td>
                  <td className="nowrap">{payment.method}</td>
                  <td className="mono">{payment.voidedOn ? <Tag tone="bad">Void</Tag> : payment.reference}</td>
                  <td className="num">{formatMoney(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={rows.length} basePath={`/${school}/fees/receipts`} params={{ from: filters.from, to: filters.to, method: filters.method, q: filters.q }} />
      </div>
    </>
  );
}
