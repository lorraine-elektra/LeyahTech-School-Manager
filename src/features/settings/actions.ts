'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { schools } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { requireViewer } from '@/features/auth/session';
import { termLabel } from '@/features/school/calendar';
import { schoolChanged } from '@/lib/revalidate';
import { formValues, type FormState } from '@/ui/formState';
import { normalisePhone } from '@/ui/format';
import { accentColors } from './accents';

async function requireHeadteacher(schoolSlug: string) {
  const viewer = await requireViewer(schoolSlug);
  if (viewer.role !== 'headteacher') throw new Error('Only the headteacher can change school settings.');
  return viewer;
}

export async function updateSchoolProfile(schoolSlug: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const v = formValues(formData);
  if (!v.name || !v.shortName || !v.address) return { error: 'Enter the school name, short name and address.' };
  if (v.shortName.length > 12) return { error: 'Keep the short name to 12 characters or fewer.' };
  const phone = normalisePhone(v.phone ?? '');
  if (!phone) return { error: 'The phone number should be 10 digits, like 030 291 4470.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email ?? '')) return { error: 'Enter a valid email address.' };
  if (!accentColors.some((c) => c.value === v.accentColor)) return { error: 'Choose one of the school colours.' };

  await db
    .update(schools)
    .set({ name: v.name, shortName: v.shortName, address: v.address, phone, email: v.email, accentColor: v.accentColor })
    .where(eq(schools.id, viewer.school.id));
  await recordActivity(viewer, 'Settings', 'Updated the school profile', '/settings');
  schoolChanged(viewer);
  return { saved: 'School profile saved.' };
}

export async function setCurrentTerm(schoolSlug: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const term = viewer.terms.find((t) => t.id === formData.get('termId'));
  if (!term) return { error: 'Choose a term.' };
  if (term.id === viewer.currentTerm.id) return { saved: `${termLabel(term)} is already the current term.` };
  await db.update(schools).set({ currentTermId: term.id }).where(eq(schools.id, viewer.school.id));
  await recordActivity(viewer, 'Settings', `Set the current term to ${termLabel(term)}`, '/settings');
  schoolChanged(viewer);
  return { saved: `The current term is now ${termLabel(term)}.` };
}
