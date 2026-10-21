import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { feeItems } from '@/db/schema';
import { allow, canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { sumMoney } from '@/features/fees/accounts';
import { termLabel } from '@/features/school/calendar';
import { formatMoney } from '@/ui/format';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { TermSelect } from '@/ui/TermSelect';

const columns = [
  { key: 'JHS', label: 'JHS (Basic 7 to 9)', level: 'JHS', programme: null },
  { key: 'SHS', label: 'SHS General Arts and Business', level: 'SHS', programme: null },
  { key: 'SHS-Science', label: 'SHS Science', level: 'SHS', programme: 'Science' },
] as const;

export default async function FeeSchedulePage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ term?: string }> }) {
  const viewer = await requireViewer((await params).school);
  allow(canViewFees(viewer) && isOfficeStaff(viewer));
  const termId = (await searchParams).term;
  const term = viewer.terms.find((t) => t.id === termId) ?? viewer.currentTerm;
  const items = await db.select().from(feeItems).where(and(eq(feeItems.schoolId, viewer.school.id), eq(feeItems.termId, term.id)));
  const names = [...new Set(items.map((i) => i.name))];
  const itemsFor = (column: (typeof columns)[number]) =>
    items.filter((i) => i.level === column.level && (!i.programme || i.programme === column.programme));

  return (
    <>
      <PageHeader title="Fee schedule" meta={`${termLabel(term)} · Day students`} />
      <FilterBar>
        <TermSelect terms={viewer.terms} value={term.id} />
      </FilterBar>
      <div className="table-wrap" style={{ maxWidth: 820 }}>
        {items.length === 0 ? (
          <p className="empty">No fees set for this term yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                {columns.map((c) => (
                  <th key={c.key} className="num">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.map((name) => (
                <tr key={name}>
                  <td>{name}</td>
                  {columns.map((c) => {
                    const item = itemsFor(c).find((i) => i.name === name);
                    return (
                      <td key={c.key} className="num">
                        {item ? formatMoney(item.amount) : <span className="faint">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total per term</td>
                {columns.map((c) => (
                  <td key={c.key} className="num">
                    {formatMoney(sumMoney(itemsFor(c), (i) => i.amount))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Scholarships are taken off tuition or the term total, as set on each scholarship.
      </p>
    </>
  );
}
