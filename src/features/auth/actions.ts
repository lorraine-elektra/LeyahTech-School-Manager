'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users } from '@/db/schema';
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

  const [user] = await db.select().from(users).where(and(eq(users.schoolId, school.id), eq(users.username, username)));
  const valid = user && !user.disabledAt && (await verifyPassword(password, user.passwordHash));
  if (!valid) return { error: 'Username or password is incorrect. Check both and try again.', username };

  await startSession(user.id);
  redirect(`/${school.slug}`);
}

export async function signOut(schoolSlug: string) {
  await endSession();
  redirect(`/${schoolSlug}/login`);
}
