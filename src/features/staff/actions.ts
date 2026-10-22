'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { staff, users } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { clearFailedSignIns } from '@/features/auth/lockout';
import { generateTemporaryPassword, hashPassword } from '@/features/auth/password';
import { endAllSessions, requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { normalisePhone } from '@/ui/format';
import { staffName } from './names';
import { staffPositions } from './types';

export interface StaffFormState {
  error?: string;
  values?: Record<string, string>;
  issued?: { name: string; username: string; password: string };
}

async function requireHeadteacher(schoolSlug: string) {
  const viewer = await requireViewer(schoolSlug);
  if (viewer.role !== 'headteacher') throw new Error('Only the headteacher can manage staff accounts.');
  return viewer;
}

export async function addStaffMember(schoolSlug: string, _previous: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));
  const fail = (error: string) => ({ error, values });
  if (!values.title || !values.firstName || !values.surname) return fail('Enter the title, first name and surname.');
  if (!staffPositions.includes(values.position as (typeof staffPositions)[number])) return fail('Choose a position.');
  const phone = values.phone ? normalisePhone(values.phone) : null;
  if (values.phone && !phone) return fail('The phone number should be 10 digits, like 024 412 6630.');
  if (values.joinedOn && values.joinedOn > todayIso()) return fail('The date joined cannot be in the future.');

  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password);
  const result = await db.transaction(async (tx) => {
    // Serialises staff numbering per school, so two headteachers adding staff at once get different numbers.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${viewer.school.id} || ':staff'))`);
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(substring(${staff.staffNo} from '[0-9]+$')::int), 0) + 1` })
      .from(staff)
      .where(eq(staff.schoolId, viewer.school.id));
    const [member] = await tx
      .insert(staff)
      .values({
        schoolId: viewer.school.id,
        staffNo: `STF/${String(next).padStart(3, '0')}`,
        title: values.title,
        firstName: values.firstName,
        surname: values.surname,
        position: values.position,
        phone,
        qualification: values.qualification || null,
        joinedOn: values.joinedOn || todayIso(),
      })
      .returning();
    const base = `${values.firstName[0]}${values.surname}`.toLowerCase().replace(/[^a-z]/g, '');
    const taken = new Set(
      (await tx.select({ username: users.username }).from(users).where(and(eq(users.schoolId, viewer.school.id), sql`${users.username} like ${base + '%'}`))).map((u) => u.username),
    );
    let username = base;
    for (let n = 2; taken.has(username); n++) username = `${base}${n}`;
    await tx.insert(users).values({ schoolId: viewer.school.id, username, passwordHash, staffId: member.id, mustChangePassword: true });
    return { member, username };
  });

  await recordActivity(viewer, 'Staff', `Added ${staffName(result.member)} (${result.member.staffNo}) as ${result.member.position} with login ${result.username}`, '/staff');
  revalidatePath(`/${schoolSlug}/staff`);
  return { issued: { name: staffName(result.member), username: result.username, password } };
}

export async function resetPassword(schoolSlug: string, userId: string, _previous: StaffFormState): Promise<StaffFormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const [account] = await db.select().from(users).where(and(eq(users.schoolId, viewer.school.id), eq(users.id, userId)));
  if (!account) return { error: 'This login no longer exists. Reload the page.' };
  const password = generateTemporaryPassword();
  await db.update(users).set({ passwordHash: await hashPassword(password), mustChangePassword: true }).where(eq(users.id, account.id));
  await endAllSessions(account.id);
  await clearFailedSignIns(viewer.school.id, account.username);
  await recordActivity(viewer, 'Staff', `Reset the password for ${account.username}`, '/staff');
  return { issued: { name: account.username, username: account.username, password } };
}

export async function setLoginDisabled(schoolSlug: string, userId: string, disabled: boolean) {
  const viewer = await requireHeadteacher(schoolSlug);
  if (userId === viewer.userId) throw new Error('You cannot disable your own login.');
  const [account] = await db
    .update(users)
    .set({ disabledAt: disabled ? new Date() : null })
    .where(and(eq(users.schoolId, viewer.school.id), eq(users.id, userId)))
    .returning();
  if (!account) return;
  if (disabled) await endAllSessions(account.id);
  await recordActivity(viewer, 'Staff', `${disabled ? 'Disabled' : 'Enabled'} the login ${account.username}`, '/staff');
  revalidatePath(`/${schoolSlug}/staff`);
}
