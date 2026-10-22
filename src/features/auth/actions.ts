'use server';

import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { clearFailedSignIns, isLockedOut, LOCKOUT_MINUTES, recordFailedSignIn } from './lockout';
import { verifyPassword } from './password';
import { endSession, findSchoolBySlug, startSession } from './session';

export interface SignInState {
  error?: string;
  username?: string;
}

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const schoolSlug = String(formData.get('school'));
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const school = await findSchoolBySlug(schoolSlug);
  if (!school) return { error: 'This school code is not recognised. Go back and enter the code again.', username };

  if (await isLockedOut(school.id, username)) {
    return { error: `Too many failed attempts for this username. Wait ${LOCKOUT_MINUTES} minutes, or ask the headteacher to reset your password.`, username };
  }
  const [user] = await db.select().from(users).where(and(eq(users.schoolId, school.id), eq(users.username, username)));
  const valid = user && !user.disabledAt && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await recordFailedSignIn(school.id, username, ip);
    return { error: 'Username or password is incorrect. Check both and try again.', username };
  }

  await clearFailedSignIns(school.id, username);
  await startSession(user.id);
  if (user.mustChangePassword) redirect(`/${school.slug}/account?first=1`);
  redirect(`/${school.slug}`);
}

export async function signOut(schoolSlug: string) {
  await endSession();
  redirect(`/${schoolSlug}/login`);
}
