import Link from 'next/link';
import { canRecordPayments } from '@/features/auth/permissions';
import type { Viewer } from '@/features/auth/session';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { Meter, toneForRate } from '@/ui/Charts';
import { EmptyState } from '@/ui/EmptyState';
import { FilterBar } from '@/ui/FilterBar';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { PAGE_SIZE, pageFrom, Pagination } from '@/ui/Pagination';
import { TermSelect } from '@/ui/TermSelect';
import { formatBalance, formatMoney, formatPercent } from '@/ui/format';
import { FeeStandingTag } from './FeeStandingTag';
import { feeStanding, summariseCollection } from './accounts';
import { filterFeeAccounts, standingOptions, type FeeAccountFilters } from './filters';
import { schoolFeeAccounts } from './queries';

export async function FeeAccountsPage({ viewer, filters }: { viewer: Viewer; filters: FeeAccountFilters }) {
  const base = `/${viewer.school.slug}`;
  const term = viewer.terms.find((t) => t.id === filters.term) ?? viewer.currentTerm;
  const standing = filters.standing ?? 'all';
  const [rows, classes] = await Promise.all([schoolFeeAccounts(viewer, term.id), getClasses(viewer.school.id, term.academicYear)]);
  const filtered = filterFeeAccounts(rows, filters);
  const totals = summariseCollection(filtered.map((r) => r.account));
  const page = pageFrom(filters.page);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const collectedShare = totals.due > 0 ? (totals.collected / totals.due) * 100 : 0;
  const params = { term: filters.term, class: filters.class, standing: filters.standing, q: filters.q };
  const exportQuery = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));

  return (
    <>
      <PageHeader
        title="Fee accounts"
        meta={termLabel(term)}
        actions={
          <>
            <a className="button" href={`${base}/exports/fee-accounts?${exportQuery}`}>
              <Icon name="download" /> Export CSV
            </a>
            {canRecordPayments(viewer) && (
              <Link className="button button--primary" href={`${base}/fees/payments/new`}>
                <Icon name="payment" /> Record payment
              </Link>
            )}
          </>
        }
      />
      <dl className="key-figures" style={{ marginBottom: 18 }}>
        <div>
          <dt>Due this term</dt>
          <dd>{formatMoney(totals.due)}</dd>
          <div className="key-figures__note">Fees and arrears, less scholarships</div>
        </div>
        <div>
          <dt>Collected</dt>
          <dd>{formatMoney(totals.collected)}</dd>
          <div style={{ marginTop: 8 }}>
            <Meter value={collectedShare} tone={toneForRate(collectedShare, 75, 50)} thin />
          </div>
          <div className="key-figures__note">{formatPercent(collectedShare)} of what is due</div>
        </div>
        <div>
          <dt>Outstanding</dt>
          <dd className={totals.outstanding > 0 ? 'bad' : undefined}>{formatMoney(totals.outstanding)}</dd>
          <div className="key-figures__note">{totals.studentsOwing} students owe</div>
        </div>
        <div>
          <dt>Arrears brought forward</dt>
          <dd>{formatMoney(totals.arrearsBroughtForward)}</dd>
          <div className="key-figures__note">From earlier terms</div>
        </div>
      </dl>
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
          <EmptyState icon="fees">No fee accounts match these filters.</EmptyState>
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
              {shown.map(({ student, schoolClass, account }) => (
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
        <Pagination page={page} total={filtered.length} basePath={`${base}/fees`} params={params} />
      </div>
    </>
  );
}
