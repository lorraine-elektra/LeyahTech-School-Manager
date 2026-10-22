'use server';

import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, staff } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { requireViewer } from '@/features/auth/session';
import { programmes } from '@/features/school/subjects';
import type { Programme } from '@/features/school/types';
import { staffName } from '@/features/staff/names';
import { schoolChanged } from '@/lib/revalidate';
import { formValues, type FormState } from '@/ui/formState';
import { className } from './naming';

async function requireHeadteacher(schoolSlug: string) {
  const viewer = await requireViewer(schoolSlug);
  if (viewer.role !== 'headteacher') throw new Error('Only the headteacher can change classes.');
  return viewer;
}

// A teacher leads at most one class a year, because their register is chosen from it.
async function teacherProblem(schoolId: string, academicYear: string, teacherId: string, exceptClassId?: string) {
  const [member] = await db.select().from(staff).where(and(eq(staff.schoolId, schoolId), eq(staff.id, teacherId)));
  if (!member) return 'Choose a class teacher from the staff list.';
  const [other] = await db
    .select({ name: classes.name })
    .from(classes)
    .where(
      and(eq(classes.schoolId, schoolId), eq(classes.academicYear, academicYear), eq(classes.classTeacherId, teacherId), exceptClassId ? ne(classes.id, exceptClassId) : undefined),
    );
  return other ? `${staffName(member)} is already class teacher of ${other.name}.` : undefined;
}

export async function addClass(schoolSlug: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const v = formValues(formData);
  const { academicYear } = viewer.currentTerm;
  const yearGroup = Number(v.yearGroup);
  if (!(yearGroup >= 7 && yearGroup <= 12)) return { error: 'Choose a year.' };
  const level = yearGroup <= 9 ? 'JHS' : 'SHS';
  const programme = level === 'SHS' ? (programmes.find((p) => p === v.programme) ?? null) : null;
  if (level === 'SHS' && !programme) return { error: 'Choose a programme for an SHS class.' };
  const stream = v.stream ? v.stream.toUpperCase() : null;
  if (stream && !/^[A-Z]$/.test(stream)) return { error: 'The stream should be a single letter, like A or B.' };
  const name = className(yearGroup, programme as Programme | null, stream);

  if (v.classTeacherId) {
    const problem = await teacherProblem(viewer.school.id, academicYear, v.classTeacherId);
    if (problem) return { error: problem };
  }
  const [existing] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.schoolId, viewer.school.id), eq(classes.academicYear, academicYear), eq(classes.name, name)));
  if (existing) return { error: `${name} already exists for ${academicYear}. Use a different stream letter.` };

  const [created] = await db
    .insert(classes)
    .values({ schoolId: viewer.school.id, academicYear, name, level, yearGroup, stream, programme, classTeacherId: v.classTeacherId || null, room: v.room || null })
    .returning({ id: classes.id });
  await recordActivity(viewer, 'Settings', `Added the class ${name} for ${academicYear}`, `/classes/${created.id}`);
  schoolChanged(viewer);
  return { saved: `${name} added.` };
}

export async function updateClass(schoolSlug: string, classId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireHeadteacher(schoolSlug);
  const v = formValues(formData);
  const [schoolClass] = await db.select().from(classes).where(and(eq(classes.schoolId, viewer.school.id), eq(classes.id, classId)));
  if (!schoolClass) return { error: 'This class no longer exists.' };
  if (v.classTeacherId) {
    const problem = await teacherProblem(viewer.school.id, schoolClass.academicYear, v.classTeacherId, classId);
    if (problem) return { error: problem };
  }
  await db
    .update(classes)
    .set({ classTeacherId: v.classTeacherId || null, room: v.room || null })
    .where(eq(classes.id, classId));
  await recordActivity(viewer, 'Settings', `Updated the class teacher and room for ${schoolClass.name}`, `/classes/${classId}`);
  schoolChanged(viewer);
  return { saved: 'Class details saved.' };
}
