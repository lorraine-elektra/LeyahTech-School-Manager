import 'server-only';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { db } from '@/db/client';
import { classes, guardians, schools, sessions, staff, teachingAssignments, terms, users } from '@/db/schema';
import { sortTerms } from '@/features/school/calendar';
import type { School, TeachingAssignment, Term } from '@/features/school/types';
import type { StaffMember } from '@/features/staff/types';
import type { Guardian } from '@/features/students/types';
import type { Role } from './types';

const SESSION_COOKIE = 'sms_session';
const SESSION_HOURS = 12;

export interface Viewer {
  userId: string;
  username: string;
  role: Role;
  school: School;
  terms: Term[];
  currentTerm: Term;
  staff: StaffMember | null;
  guardian: Guardian | null;
  ownClassId: string | null;
  assignments: TeachingAssignment[];
  mustChangePassword: boolean;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  cookieStore.delete(SESSION_COOKIE);
}

export async function endAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Signs the user out everywhere except the browser making this request.
export async function endOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.delete(sessions).where(and(eq(sessions.userId, userId), token ? ne(sessions.tokenHash, hashToken(token)) : undefined));
}

export async function findSchoolBySlug(slug: string): Promise<School | undefined> {
  const [school] = await db.select().from(schools).where(eq(schools.slug, slug));
  return school;
}

function roleFor(member: StaffMember | null, ownClassId: string | null): Role {
  if (!member) return 'parent';
  if (member.position === 'Headteacher' || member.position === 'Assistant Headteacher') return 'headteacher';
  if (member.position === 'Bursar' || member.position === 'Accounts Clerk') return 'bursar';
  return ownClassId ? 'classTeacher' : 'subjectTeacher';
}

const loadViewer = cache(async (schoolSlug: string): Promise<Viewer | undefined> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;

  const [row] = await db
    .select({ user: users, school: schools })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(schools, eq(schools.id, users.schoolId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
  // A session only opens the school its user belongs to.
  if (!row || row.school.slug !== schoolSlug || row.user.disabledAt) return undefined;

  const { user, school } = row;
  const schoolTerms = sortTerms(await db.select().from(terms).where(eq(terms.schoolId, school.id)));
  const currentTerm = schoolTerms.find((t) => t.id === school.currentTermId) ?? schoolTerms[schoolTerms.length - 1];
  const [member] = user.staffId ? await db.select().from(staff).where(eq(staff.id, user.staffId)) : [];
  const [guardian] = user.guardianId ? await db.select().from(guardians).where(eq(guardians.id, user.guardianId)) : [];

  let ownClassId: string | null = null;
  let assignments: TeachingAssignment[] = [];
  if (member) {
    const [ownClass] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.schoolId, school.id), eq(classes.academicYear, currentTerm.academicYear), eq(classes.classTeacherId, member.id)));
    ownClassId = ownClass?.id ?? null;
    assignments = (
      await db
        .select({ assignment: teachingAssignments })
        .from(teachingAssignments)
        .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
        .where(and(eq(teachingAssignments.teacherId, member.id), eq(classes.academicYear, currentTerm.academicYear)))
    ).map((r) => r.assignment);
  }

  return {
    userId: user.id,
    username: user.username,
    role: roleFor(member ?? null, ownClassId),
    school,
    terms: schoolTerms,
    currentTerm,
    staff: member ?? null,
    guardian: guardian ?? null,
    ownClassId,
    assignments,
    mustChangePassword: user.mustChangePassword,
  };
});

export async function requireViewer(schoolSlug: string): Promise<Viewer> {
  const viewer = await loadViewer(schoolSlug);
  if (viewer) return viewer;
  if (!(await findSchoolBySlug(schoolSlug))) notFound();
  redirect(`/${schoolSlug}/login`);
}

export async function optionalViewer(schoolSlug: string): Promise<Viewer | undefined> {
  return loadViewer(schoolSlug);
}
