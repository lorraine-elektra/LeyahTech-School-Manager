'use server';

import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { subjectScores } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canEnterScores } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel } from '@/features/school/calendar';
import { CLASS_SCORE_MAX, EXAM_SCORE_MAX } from '@/features/school/grading';
import { getClass } from '@/features/school/queries';
import { classRoll } from '@/features/students/queries';
import { schoolChanged } from '@/lib/revalidate';

export interface ScoreFormState {
  error?: string;
  savedAt?: string;
  invalid?: string[];
}

function parseScore(raw: FormDataEntryValue | null, max: number): number | null | 'invalid' {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > max || Math.round(value * 2) !== value * 2) return 'invalid';
  return value;
}

export async function saveScores(schoolSlug: string, classId: string, subjectId: string, _previous: ScoreFormState, formData: FormData): Promise<ScoreFormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canEnterScores(viewer, classId, subjectId)) return { error: 'Only the teacher assigned to this subject can enter its scores.' };
  const roll = (await classRoll(viewer.school.id, classId)).filter((s) => s.status === 'Active');

  const invalid: string[] = [];
  const rows = roll.map((student) => {
    const classScore = parseScore(formData.get(`class:${student.id}`), CLASS_SCORE_MAX);
    const examScore = parseScore(formData.get(`exam:${student.id}`), EXAM_SCORE_MAX);
    if (classScore === 'invalid' || examScore === 'invalid') invalid.push(student.id);
    return { student, classScore, examScore };
  });
  if (invalid.length) {
    return {
      error: `${invalid.length === 1 ? '1 score is' : `${invalid.length} scores are`} out of range. Class scores must be 0 to ${CLASS_SCORE_MAX} and exam scores 0 to ${EXAM_SCORE_MAX}, in whole or half marks. Fix the highlighted rows and save again.`,
      invalid,
    };
  }

  const values = rows.map(({ student, classScore, examScore }) => ({
    schoolId: viewer.school.id,
    termId: viewer.currentTerm.id,
    studentId: student.id,
    subjectId,
    classScore: classScore as number | null,
    examScore: examScore as number | null,
    updatedBy: viewer.staff!.id,
    updatedAt: new Date(),
  }));
  if (values.length) {
    await db
      .insert(subjectScores)
      .values(values)
      .onConflictDoUpdate({
        target: [subjectScores.termId, subjectScores.studentId, subjectScores.subjectId],
        set: {
          classScore: sql`excluded.class_score`,
          examScore: sql`excluded.exam_score`,
          updatedBy: sql`excluded.updated_by`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
  const [schoolClass, subject] = await Promise.all([getClass(viewer.school.id, classId), db.query.subjects.findFirst({ where: (s, { eq }) => eq(s.id, subjectId) })]);
  await recordActivity(viewer, 'Scores', `Saved ${subject?.name ?? 'subject'} scores for ${schoolClass?.name ?? 'a class'}, ${termLabel(viewer.currentTerm)}`, `/scores/${classId}/${subjectId}`);
  schoolChanged(viewer);
  return { savedAt: new Date().toISOString() };
}
