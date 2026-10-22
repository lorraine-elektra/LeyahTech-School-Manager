'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { feeItems } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canManageFees } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel, todayIso } from '@/features/school/calendar';
import { schoolChanged } from '@/lib/revalidate';
import type { FormState } from '@/ui/formState';
import { roundMoney } from './accounts';
import { scheduleColumns } from './schedule';

const MAX_ITEM = 50_000;

function parseAmount(raw: FormDataEntryValue): number | undefined {
  const text = String(raw).replace(/,/g, '').trim();
  if (text === '') return undefined;
  const amount = roundMoney(Number(text));
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_ITEM ? amount : NaN;
}

export async function saveFeeSchedule(schoolSlug: string, termId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canManageFees(viewer)) throw new Error('Only the bursar or headteacher can change the fee schedule.');
  const term = viewer.terms.find((t) => t.id === termId);
  if (!term) return { error: 'Choose a term.' };
  if (term.endsOn < todayIso()) return { error: 'This term has ended, so its fees can no longer be changed.' };

  const existing = await db.select().from(feeItems).where(and(eq(feeItems.schoolId, viewer.school.id), eq(feeItems.termId, term.id)));
  const updates: { id: string; amount: number }[] = [];
  const removals: string[] = [];
  const inserts: (typeof feeItems.$inferInsert)[] = [];
  const newName = String(formData.get('newName') ?? '').trim();

  for (const [key, raw] of formData.entries()) {
    const amount = parseAmount(raw);
    if (key.startsWith('amount:')) {
      const item = existing.find((i) => i.id === key.slice(7));
      if (!item || amount === undefined) continue;
      if (Number.isNaN(amount)) return { error: `Check the amount for ${item.name}. Use cedis, up to GH₵ ${MAX_ITEM.toLocaleString()}.` };
      if (amount === 0) removals.push(item.id);
      else if (amount !== item.amount) updates.push({ id: item.id, amount });
    } else if (key.startsWith('new:') || key.startsWith('newAmount:')) {
      const [, columnKey, encodedName] = key.split(':');
      const name = key.startsWith('new:') ? decodeURIComponent(encodedName) : newName;
      const column = scheduleColumns.find((c) => c.key === columnKey);
      if (!column || !amount) continue;
      if (Number.isNaN(amount)) return { error: `Check the amount for ${name || 'the new item'}.` };
      if (!name) return { error: 'Enter a name for the new item.' };
      inserts.push({ schoolId: viewer.school.id, termId: term.id, level: column.level, programme: column.programme, name, amount, isTuition: false });
    }
  }
  if (newName && existing.some((i) => i.name.toLowerCase() === newName.toLowerCase())) return { error: `${newName} is already on the schedule. Change its amounts in the table.` };
  if (!updates.length && !removals.length && !inserts.length) return { saved: 'No changes to save.' };

  await db.transaction(async (tx) => {
    for (const u of updates) await tx.update(feeItems).set({ amount: u.amount }).where(eq(feeItems.id, u.id));
    if (removals.length) await tx.delete(feeItems).where(inArray(feeItems.id, removals));
    if (inserts.length) await tx.insert(feeItems).values(inserts);
    const changes = updates.length + removals.length + inserts.length;
    await recordActivity(viewer, 'Fees', `Changed ${changes} ${changes === 1 ? 'amount' : 'amounts'} on the ${termLabel(term)} fee schedule`, `/fees/schedule?term=${term.id}`, tx);
  });
  schoolChanged(viewer);
  return { saved: 'Fee schedule saved. Fee accounts for this term now use the new amounts.' };
}
