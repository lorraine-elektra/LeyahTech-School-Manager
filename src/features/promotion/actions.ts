'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { classes, enrolments, studentMovements, students } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canManagePromotion } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { getClass } from '@/features/school/queries';
import { schoolChanged } from '@/lib/revalidate';
import { promotionRows } from './data';
import { decisionOptions, isFinalYear, nextAcademicYear, nextClassName, type PromotionDecision } from './decisions';

export interface PromotionFormState {
  error?: string;
}

export async function confirmPromotion(schoolSlug: string, classId: string, _previous: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canManagePromotion(viewer)) return { error: 'Only the headteacher can confirm promotion.' };
  const schoolClass = await getClass(viewer.school.id, classId);
  if (!schoolClass || schoolClass.academicYear !== viewer.currentTerm.academicYear) return { error: 'Promotion can only be confirmed for this academic year’s classes.' };
  if (viewer.currentTerm.name !== '3rd Term') return { error: 'Promotion is confirmed in the 3rd term, after the final results are in.' };

  const { rows } = await promotionRows(viewer, schoolClass);
  const pending = rows.filter((r) => !r.recorded);
  const decisions = pending.map((row) => ({ row, decision: String(formData.get(`decision:${row.student.id}`) ?? '') as PromotionDecision }));
  if (decisions.some((d) => !decisionOptions.includes(d.decision))) return { error: 'Choose a decision for every student before confirming.' };
  if (decisions.some((d) => d.decision === 'Completed' && !isFinalYear(schoolClass))) {
    return { error: `Only final-year classes can be marked Completed. Choose Promoted, Promoted on trial or Repeated for ${schoolClass.name}.` };
  }

  const targetYear = nextAcademicYear(schoolClass.academicYear);
  await db.transaction(async (tx) => {
    for (const { row, decision } of decisions) {
      await tx.update(enrolments).set({ outcome: decision }).where(and(eq(enrolments.studentId, row.student.id), eq(enrolments.academicYear, schoolClass.academicYear)));
      if (decision === 'Completed') {
        await tx
          .update(students)
          .set({ status: 'Completed', exitedOn: viewer.currentTerm.endsOn, exitReason: `Completed ${schoolClass.level}.` })
          .where(eq(students.id, row.student.id));
        continue;
      }
      const targetName = nextClassName(schoolClass, decision)!;
      let [target] = await tx
        .select()
        .from(classes)
        .where(and(eq(classes.schoolId, viewer.school.id), eq(classes.academicYear, targetYear), eq(classes.name, targetName)));
      if (!target) {
        [target] = await tx
          .insert(classes)
          .values({
            schoolId: viewer.school.id,
            academicYear: targetYear,
            name: targetName,
            level: schoolClass.level,
            yearGroup: decision === 'Repeated' ? schoolClass.yearGroup : schoolClass.yearGroup + 1,
            stream: schoolClass.stream,
            programme: schoolClass.programme,
            classTeacherId: null,
            room: null,
          })
          .returning();
      }
      await tx.insert(enrolments).values({ schoolId: viewer.school.id, studentId: row.student.id, academicYear: targetYear, classId: target.id }).onConflictDoNothing();
      if (decision === 'Repeated') {
        await tx.insert(studentMovements).values({
          schoolId: viewer.school.id,
          studentId: row.student.id,
          kind: 'Repeat',
          date: viewer.currentTerm.endsOn,
          details: `To repeat ${targetName.replace(/[AB]$/, '')}. Annual average ${row.annualAverage ?? 'not available'}.`,
          recordedBy: viewer.staff?.id ?? null,
        });
      }
    }
  });
  await recordActivity(viewer, 'Promotion', `Confirmed promotion for ${schoolClass.name}, ${schoolClass.academicYear}`, `/promotion?class=${classId}`);
  schoolChanged(viewer);
  redirect(`/${schoolSlug}/promotion?class=${classId}&confirmed=1`);
}
