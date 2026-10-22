'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { hashPassword, verifyPassword } from './password';
import { passwordProblem } from './passwordRules';
import { endOtherSessions, requireViewer } from './session';

export interface PasswordFormState {
  error?: string;
  saved?: boolean;
}

export async function changePassword(schoolSlug: string, _previous: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const viewer = await requireViewer(schoolSlug);
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const [account] = await db.select().from(users).where(eq(users.id, viewer.userId));
  if (!(await verifyPassword(current, account.passwordHash))) return { error: 'Your current password is not correct. Check it and try again.' };
  const problem = passwordProblem(next, viewer.username);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: 'The two new passwords do not match. Type the new password again in both boxes.' };
  if (next === current) return { error: 'Choose a password different from the one you have now.' };

  await db.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(users.id, viewer.userId));
  await endOtherSessions(viewer.userId);
  return { saved: true };
}
