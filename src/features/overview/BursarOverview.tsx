import Link from 'next/link';
import type { Viewer } from '@/features/auth/session';
import { summariseCollection } from '@/features/fees/accounts';
import { recentPayments, schoolFeeAccounts } from '@/features/fees/queries';
import { termLabel, todayIso } from '@/features/school/calendar';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { formatDateWithDay, formatMoney } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';

export async function BursarOverview({ viewer }: { viewer: Viewer }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const [feeRows, paymentsToday] = await Promise.all([schoolFeeAccounts(viewer), recentPayments(viewer, 50, today)]);
  const collection = summariseCollection(feeRows.map((r) => r.account));
  const largestBalances = [...feeRows].filter((r) => r.account.balance > 0).sort((a, b) => b.account.balance - a.account.balance).slice(0, 15);
  const validToday = paymentsToday.filter((p) => !p.payment.voidedOn);

  return (
    <>
      <PageHeader
        title="Overview"
        meta={`${termLabel(viewer.currentTerm)} · ${formatDateWithDay(today)}`}
        actions={
          <Link className="button button--primary" href={`${base}/fees/payments/new`}>
            Record payment
          </Link>
        }
      />

      <dl className="key-figures">
        <div>
          <dt>Term fees billed</dt>
          <dd>{formatMoney(collection.billed - collection.discounts)}</dd>
        </div>
        <div>
          <dt>Arrears brought forward</dt>
          <dd>{formatMoney(collection.arrearsBroughtForward)}</dd>
        </div>
        <div>
          <dt>Collected this term</dt>
          <dd>{formatMoney(collection.collected)}</dd>
        </div>
        <div>
          <dt>Outstanding</dt>
          <dd>{formatMoney(collection.outstanding)}</dd>
        </div>
      </dl>

      <Section title="Payments today" aside={`${validToday.length} receipts · ${formatMoney(validToday.reduce((s, p) => s + p.payment.amount, 0))}`}>
        <div className="table-wrap">
          {paymentsToday.length === 0 ? (
            <p className="empty">No payments recorded today.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Paid by</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentsToday.map(({ payment, student }) => (
                  <tr key={payment.id} className={payment.voidedOn ? 'row-muted' : undefined}>
                    <td className="mono">
                      <Link href={`${base}/fees/receipts/${payment.id}`}>{payment.receiptNo}</Link>
                      {payment.voidedOn && ' (void)'}
                    </td>
                    <td>{studentRegisterName(student)}</td>
                    <td>{payment.paidBy}</td>
                    <td>{payment.method}</td>
                    <td className="num">{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      <Section title="Largest balances" aside={<Link href={`${base}/fees?standing=owing`}>All students owing</Link>}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th className="num">Arrears b/f</th>
                <th className="num">Paid this term</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {largestBalances.map(({ student, schoolClass, account }) => (
                <tr key={student.id}>
                  <td>
                    <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}/fees`}>{studentRegisterName(student)}</Link>
                    {student.status !== 'Active' && <span className="muted"> · {student.status}</span>}
                  </td>
                  <td>{schoolClass?.name}</td>
                  <td className="num">{formatMoney(account.arrearsBroughtForward)}</td>
                  <td className="num">{formatMoney(account.paid)}</td>
                  <td className="num bad">{formatMoney(account.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
