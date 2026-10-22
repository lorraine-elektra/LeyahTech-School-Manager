'use server';

import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendanceEntries, attendanceSheets } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canMarkAttendance } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { isSchoolDay, todayIso } from '@/features/school/calendar';
import { getClass } from '@/features/school/queries';
import { classRoll, isEnrolledOn } from '@/features/students/queries';
import { schoolChanged } from '@/lib/revalidate';
import { formatDate } from '@/ui/format';
import { attendanceStatuses } from './summary';
import type { AttendanceStatus } from './types';

export interface AttendanceFormState {
  error?: string;
  savedAt?: string;
}

export async function saveAttendance(schoolSlug: string, classId: string, date: string, _previous: AttendanceFormState, formData: FormData): Promise<AttendanceFormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canMarkAttendance(viewer, classId)) return { error: 'Only the class teacher can mark attendance for this class.' };
  const term = viewer.currentTerm;
  if (date > todayIso()) return { error: 'Attendance cannot be marked for a future date.' };
  if (date < term.startsOn || date > term.endsOn) return { error: `Attendance can only be marked for ${term.name} dates. Choose a date between the start of term and today.` };
  if (!isSchoolDay(date)) return { error: 'This date is a weekend or public holiday. Choose a school day.' };

  const roll = (await classRoll(viewer.school.id, classId)).filter((s) => isEnrolledOn(s, date));
  const entries = roll.map((student) => {
    const status = String(formData.get(`status:${student.id}`) ?? '') as AttendanceStatus;
    const note = String(formData.get(`note:${student.id}`) ?? '').trim().slice(0, 120);
    return { studentId: student.id, status, note: note || null };
  });
  const unmarked = entries.filter((e) => !attendanceStatuses.includes(e.status)).length;
  if (unmarked) return { error: `${unmarked} students have no attendance mark. Mark every student, then save.` };

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(attendanceSheets)
      .where(and(eq(attendanceSheets.schoolId, viewer.school.id), eq(attendanceSheets.classId, classId), eq(attendanceSheets.date, date)));
    const sheetId =
      existing?.id ??
      (
        await tx
          .insert(attendanceSheets)
          .values({ schoolId: viewer.school.id, classId, date, markedBy: viewer.staff!.id, markedAt: new Date().toISOString() })
          .returning()
      )[0].id;
    if (existing) {
      await tx.update(attendanceSheets).set({ markedBy: viewer.staff!.id, markedAt: new Date().toISOString() }).where(eq(attendanceSheets.id, sheetId));
      await tx.delete(attendanceEntries).where(eq(attendanceEntries.sheetId, sheetId));
    }
    if (entries.length) await tx.insert(attendanceEntries).values(entries.map((e) => ({ ...e, sheetId })));
  });

  const absent = entries.filter((e) => e.status === 'absent').length;
  const schoolClass = await getClass(viewer.school.id, classId);
  await recordActivity(viewer, 'Attendance', `Marked ${schoolClass?.name ?? 'class'} attendance for ${formatDate(date)}: ${entries.length - absent} in, ${absent} absent`, `/attendance/${classId}?date=${date}`);
  schoolChanged(viewer);
  return { savedAt: new Date().toISOString() };
}
