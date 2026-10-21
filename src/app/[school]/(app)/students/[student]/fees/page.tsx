import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, openingBalances } from '@/db/schema';
import { allow, canRecordPayments, canViewFees } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { feeStanding, roundMoney } from '@/features/fees/accounts';
import { FeeStandingTag } from '@/features/fees/FeeStandingTag';
import { studentFeeHistory } from '@/features/fees/queries';
import { termLabel } from '@/features/school/calendar';
import { loadStudent } from '@/features/students/loadStudent';
import { formatDate, formatMoney, formatBalance } from '@/ui/format';
import { Section } from '@/ui/Section';

interface StatementLine {
  key: string;
  date: string;
  description: React.ReactNode;
  charge?: number;
  credit?: number;
}

export default async function StudentFeesPage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  allow(canViewFees(viewer));
  const { student } = await loadStudent(viewer, slug);
  const [history, [opening], classRows] = await Promise.all([
    studentFeeHistory(viewer, student),
    db.select().from(openingBalances).where(eq(openingBalances.studentId, student.id)),
    db.select().from(classes).where(and(eq(classes.schoolId, viewer.school.id))),
  ]);
  const current = history.find((h) => h.termId === viewer.currentTerm.id);
  const balance = history.at(-1)?.balance ?? opening?.amount ?? 0;

  const lines: StatementLine[] = [];
  if (opening) lines.push({ key: 'opening', date: history[0] ? viewer.terms.find((t) => t.id === history[0].termId)!.startsOn : '', description: opening.note, charge: opening.amount });
  for (const account of history) {
    const term = viewer.terms.find((t) => t.id === account.termId)!;
    const className = classRows.find((c) => c.id === account.classId)?.name;
    if (account.chargesTotal) lines.push({ key: `${term.id}-fees`, date: term.startsOn, description: `Fees, ${termLabel(term)}${className ? ` (${className})` : ''}`, charge: account.chargesTotal });
    account.discounts.forEach((discount, index) => lines.push({ key: `${term.id}-d${index}`, date: term.startsOn, description: discount.name, credit: discount.amount }));
    for (const payment of [...account.payments].sort((a, b) => a.paidOn.localeCompare(b.paidOn))) {
      lines.push({
        key: payment.id,
        date: payment.paidOn,
        description: (
          <>
            Payment, {payment.method.toLowerCase()} ·{' '}
            <Link className="mono" href={`/${school}/fees/receipts/${payment.id}`}>
              {payment.receiptNo}
            </Link>
          </>
        ),
        credit: payment.amount,
      });
    }
  }
  let running = 0;

  return (
    <>
      <dl className="key-figures">
        <div>
          <dt>Balance now</dt>
          <dd className={balance > 0 ? 'bad' : undefined}>{formatBalance(balance)}</dd>
        </div>
        {current && (
          <>
            <div>
              <dt>Arrears from earlier terms</dt>
              <dd>{formatMoney(current.arrearsBroughtForward)}</dd>
            </div>
            <div>
              <dt>This term&apos;s fees less scholarship</dt>
              <dd>{formatMoney(current.chargesTotal - current.discountTotal)}</dd>
            </div>
            <div>
              <dt>Paid this term</dt>
              <dd>{formatMoney(current.paid)}</dd>
            </div>
            <div>
              <dt>Standing</dt>
              <dd>
                <FeeStandingTag standing={feeStanding(current)} />
              </dd>
            </div>
          </>
        )}
      </dl>

      <Section
        title="Statement"
        aside={
          canRecordPayments(viewer) && (
            <Link className="button button--primary" href={`/${school}/fees/payments/new?student=${slug}`}>
              Record payment
            </Link>
          )
        }
      >
        <div className="table-wrap">
          {lines.length === 0 ? (
            <p className="empty">No fees billed or payments recorded for this student.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="num">Charges</th>
                  <th className="num">Payments and discounts</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  running = roundMoney(running + (line.charge ?? 0) - (line.credit ?? 0));
                  return (
                    <tr key={line.key}>
                      <td className="nowrap">{formatDate(line.date)}</td>
                      <td>{line.description}</td>
                      <td className="num">{line.charge ? formatMoney(line.charge) : ''}</td>
                      <td className="num">{line.credit ? formatMoney(line.credit) : ''}</td>
                      <td className="num">{formatBalance(running)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
