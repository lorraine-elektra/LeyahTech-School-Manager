'use server';

import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { reportRemarks } from '@/db/schema';
import { requireViewer } from '@/features/auth/session';
import { canViewClassReports } from './access';
import { loadClassReports, resolveTerm } from './data';

const MAX_REMARK_LENGTH = 240;

function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? '').trim().slice(0, MAX_REMARK_LENGTH);
  return value || null;
}

export async function saveRemarks(schoolSlug: string, classId: string, termId: string, formData: FormData) {
  const viewer = await requireViewer(schoolSlug);
  const term = resolveTerm(viewer, termId);
  const reports = await loadClassReports(viewer, classId, term);
  const isClassTeacher = !!viewer.staff && reports.schoolClass.classTeacherId === viewer.staff.id;
  const isHeadteacher = viewer.role === 'headteacher';
  if (!canViewClassReports(viewer, reports.schoolClass) || (!isClassTeacher && !isHeadteacher)) {
    throw new Error('Only the class teacher or the headteacher can save remarks for this class.');
  }

  const rows = reports.results.map(({ student }) => {
    const existing = reports.remarks.get(student.id);
    return {
      schoolId: viewer.school.id,
      termId: term.id,
      studentId: student.id,
      conduct: isClassTeacher ? field(formData, `conduct:${student.id}`) : (existing?.conduct ?? null),
      interest: isClassTeacher ? field(formData, `interest:${student.id}`) : (existing?.interest ?? null),
      classTeacherRemark: isClassTeacher ? field(formData, `classTeacher:${student.id}`) : (existing?.classTeacherRemark ?? null),
      headteacherRemark: isHeadteacher ? field(formData, `headteacher:${student.id}`) : (existing?.headteacherRemark ?? null),
    };
  });
  if (rows.length) {
    await db
      .insert(reportRemarks)
      .values(rows)
      .onConflictDoUpdate({
        target: [reportRemarks.termId, reportRemarks.studentId],
        set: {
          conduct: sql`excluded.conduct`,
          interest: sql`excluded.interest`,
          classTeacherRemark: sql`excluded.class_teacher_remark`,
          headteacherRemark: sql`excluded.headteacher_remark`,
        },
      });
  }
  redirect(`/${schoolSlug}/reports/${classId}/remarks?term=${term.id}&saved=1`);
}
