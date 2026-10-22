import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { feeItems } from '@/db/schema';
import { allow, canManageFees, canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { sumMoney } from '@/features/fees/accounts';
import { itemsForColumn, ownItem, scheduleColumns } from '@/features/fees/schedule';
import { saveFeeSchedule } from '@/features/fees/scheduleActions';
import { termLabel, todayIso } from '@/features/school/calendar';
import { ActionForm } from '@/ui/ActionForm';
import { EmptyState } from '@/ui/EmptyState';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { TermSelect } from '@/ui/TermSelect';
import { formatAmount, formatMoney } from '@/ui/format';

export default async function FeeSchedulePage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ term?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canViewFees(viewer) && isOfficeStaff(viewer));
  const termId = (await searchParams).term;
  const term = viewer.terms.find((t) => t.id === termId) ?? viewer.currentTerm;
  const items = await db.select().from(feeItems).where(and(eq(feeItems.schoolId, viewer.school.id), eq(feeItems.termId, term.id)));
  const names = [...new Set(items.map((i) => i.name))];
  const editable = canManageFees(viewer) && term.endsOn >= todayIso();

  const table = (
    <div className="table-wrap" style={{ maxWidth: 860 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            {scheduleColumns.map((c) => (
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
              {scheduleColumns.map((c) => {
                const shown = itemsForColumn(items, c).find((i) => i.name === name);
                const own = ownItem(items, c, name);
                if (!editable) return <td key={c.key} className="num">{shown ? formatMoney(shown.amount) : <span className="faint">-</span>}</td>;
                if (shown && !own) return <td key={c.key} className="num muted" title="Same as SHS General Arts and Business">{formatMoney(shown.amount)}</td>;
                return (
                  <td key={c.key} className="num">
                    <input
                      className="input--amount"
                      name={own ? `amount:${own.id}` : `new:${c.key}:${encodeURIComponent(name)}`}
                      defaultValue={own ? formatAmount(own.amount) : ''}
                      placeholder="-"
                      inputMode="decimal"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          {editable && (
            <tr>
              <td>
                <input name="newName" placeholder="New item, for example Library levy" style={{ width: '100%' }} />
              </td>
              {scheduleColumns.map((c) => (
                <td key={c.key} className="num">
                  <input className="input--amount" name={`newAmount:${c.key}`} placeholder="-" inputMode="decimal" />
                </td>
              ))}
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>Total per term</td>
            {scheduleColumns.map((c) => (
              <td key={c.key} className="num">
                {formatMoney(sumMoney(itemsForColumn(items, c), (i) => i.amount))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      <PageHeader title="Fee schedule" meta={`${termLabel(term)} · Day students`} />
      <FilterBar>
        <TermSelect terms={viewer.terms} value={term.id} />
      </FilterBar>
      {items.length === 0 && !editable ? (
        <EmptyState icon="schedule">No fees set for this term yet.</EmptyState>
      ) : editable ? (
        <ActionForm action={saveFeeSchedule.bind(null, school, term.id)} submitLabel="Save fee schedule" className="">
          {table}
          <p className="muted" style={{ marginTop: 8 }}>
            Enter 0 to remove an item. Totals update after saving.
          </p>
        </ActionForm>
      ) : (
        table
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        Scholarships are taken off tuition or the term total, as set on each scholarship.
      </p>
    </>
  );
}
