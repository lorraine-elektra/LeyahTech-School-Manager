import 'server-only';
import { and, count, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { loginAttempts } from '@/db/schema';

export const MAX_FAILED_SIGN_INS = 5;
export const LOCKOUT_MINUTES = 15;

function windowStart() {
  return new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
}

export async function isLockedOut(schoolId: string, username: string): Promise<boolean> {
  const [row] = await db
    .select({ failures: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.schoolId, schoolId), eq(loginAttempts.username, username), gt(loginAttempts.attemptedAt, windowStart())));
  return row.failures >= MAX_FAILED_SIGN_INS;
}

export async function recordFailedSignIn(schoolId: string, username: string, ipAddress: string | null) {
  await db.insert(loginAttempts).values({ schoolId, username, ipAddress });
  // Old rows are only useful inside the window, so each failure also trims what has expired.
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}

export async function clearFailedSignIns(schoolId: string, username: string) {
  await db.delete(loginAttempts).where(and(eq(loginAttempts.schoolId, schoolId), eq(loginAttempts.username, username)));
}
