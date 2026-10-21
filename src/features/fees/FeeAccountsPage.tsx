import Link from 'next/link';
import { canRecordPayments } from '@/features/auth/permissions';
import type { Viewer } from '@/features/auth/session';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { admissionNoToSlug, studentFullName, studentRegisterName } from '@/features/students/names';
import { formatMoney, formatBalance } from '@/ui/format';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { TermSelect } from '@/ui/TermSelect';
import { feeStanding, summariseCollection } from './accounts';
import { FeeStandingTag } from './FeeStandingTag';
import { schoolFeeAccounts } from './queries';

export interface FeeAccountFilters {
  term?: string;
  class?: string;
  standing?: string;
  q?: string;
}

const standingOptions = [
  ['all', 'All students'],
  ['owing', 'Owing'],
  ['arrears', 'Owing from earlier terms'],
  ['paid', 'Fully paid'],
  ['former', 'Former students owing'],
] as const;

export async function FeeAccountsPage({ viewer, filters }: { viewer: Viewer; filters: FeeAccountFilters }) {
  const base = `/${viewer.school.slug}`;
  const term = viewer.terms.find((t) => t.id === filters.term) ?? viewer.currentTerm;
  const standing = filters.standing ?? 'all';
  const query = filters.q?.trim().toLowerCase();
  const [rows, classes] = await Promise.all([schoolFeeAccounts(viewer, term.id), getClasses(viewer.school.id, term.academicYear)]);

  const filtered = rows
    .filter(({ student, schoolClass, account }) => {
      if (filters.class && schoolClass?.id !== filters.class) return false;
      if (query && !studentFullName(student).toLowerCase().includes(query) && !student.admissionNo.toLowerCase().includes(query)) return false;
      if (standing === 'owing') return account.balance > 0;
      if (standing === 'arrears') return account.arrearsBroughtForward > account.paid && account.balance > 0;
      if (standing === 'paid') return account.balance <= 0;
      if (standing === 'former') return student.status !== 'Active' && account.balance > 0;
      return true;
    })
    .sort((a, b) => (a.schoolClass?.name ?? 'zz').localeCompare(b.schoolClass?.name ?? 'zz') || a.student.surname.localeCompare(b.student.surname));
  const totals = summariseCollection(filtered.map((r) => r.account));

  return (
    <>
      <PageHeader
        title="Fee accounts"
        meta={termLabel(term)}
        actions={
          canRecordPayments(viewer) && (
            <Link className="button button--primary" href={`${base}/fees/payments/new`}>
              Record payment
            </Link>
          )
        }
      />
      <FilterBar count={`${filtered.length} accounts`}>
        <TermSelect terms={termsUpTo(viewer.terms, viewer.currentTerm.id)} value={term.id} />
        <label className="field">
          <span>Class</span>
          <select name="class" defaultValue={filters.class ?? ''}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Show</span>
          <select name="standing" defaultValue={standing}>
            {standingOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Search</span>
          <input name="q" defaultValue={filters.q} placeholder="Name or admission no." />
        </label>
      </FilterBar>

      <div className="table-wrap">
        {filtered.length === 0 ? (
          <p className="empty">No fee accounts match these filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Admission no.</th>
                <th>Student</th>
                <th>Class</th>
                <th className="num">Arrears b/f</th>
                <th className="num">Term fees</th>
                <th className="num">Scholarship</th>
                <th className="num">Paid</th>
                <th className="num">Balance</th>
                <th>Standing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ student, schoolClass, account }) => (
                <tr key={student.id}>
                  <td className="mono">{student.admissionNo}</td>
                  <td className="nowrap">
                    <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}/fees`}>{studentRegisterName(student)}</Link>
                    {student.status !== 'Active' && <span className="muted"> · {student.status}</span>}
                  </td>
                  <td className="nowrap">{schoolClass?.name}</td>
                  <td className="num">{account.arrearsBroughtForward ? formatMoney(account.arrearsBroughtForward) : ''}</td>
                  <td className="num">{account.chargesTotal ? formatMoney(account.chargesTotal) : ''}</td>
                  <td className="num">{account.discountTotal ? formatMoney(account.discountTotal) : ''}</td>
                  <td className="num">{formatMoney(account.paid)}</td>
                  <td className={account.balance > 0 ? 'num bad' : 'num'}>{formatBalance(account.balance)}</td>
                  <td>
                    <FeeStandingTag standing={feeStanding(account)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total for {filtered.length} accounts</td>
                <td className="num">{formatMoney(totals.arrearsBroughtForward)}</td>
                <td className="num">{formatMoney(totals.billed)}</td>
                <td className="num">{formatMoney(totals.discounts)}</td>
                <td className="num">{formatMoney(totals.collected)}</td>
                <td className="num">{formatMoney(totals.outstanding)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
