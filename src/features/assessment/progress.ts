import 'server-only';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, enrolments, students, subjectScores, subjects, teachingAssignments } from '@/db/schema';
import type { Viewer } from '@/features/auth/session';
import type { SchoolClass, Subject } from '@/features/school/types';

export interface ScoreSheetProgress {
  schoolClass: SchoolClass;
  subject: Subject;
  teacherId: string;
  onRoll: number;
  classScoresEntered: number;
  examScoresEntered: number;
}

export async function scoreSheetProgress(viewer: Viewer, classIds?: string[], teacherId?: string): Promise<ScoreSheetProgress[]> {
  const schoolId = viewer.school.id;
  const { academicYear, id: termId } = viewer.currentTerm;
  const assignmentRows = await db
    .select({ assignment: teachingAssignments, schoolClass: classes, subject: subjects })
    .from(teachingAssignments)
    .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
    .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
    .where(
      and(
        eq(teachingAssignments.schoolId, schoolId),
        eq(classes.academicYear, academicYear),
        classIds ? inArray(classes.id, classIds) : undefined,
        teacherId ? eq(teachingAssignments.teacherId, teacherId) : undefined,
      ),
    );
  const relevantClassIds = [...new Set(assignmentRows.map((r) => r.schoolClass.id))];
  if (!relevantClassIds.length) return [];

  // Counted in the database: a large school has tens of thousands of score rows per term.
  const countRows = await db
    .select({
      classId: enrolments.classId,
      subjectId: teachingAssignments.subjectId,
      onRoll: count(),
      classScoresEntered: count(subjectScores.classScore),
      examScoresEntered: count(subjectScores.examScore),
    })
    .from(enrolments)
    .innerJoin(students, and(eq(students.id, enrolments.studentId), eq(students.status, 'Active')))
    .innerJoin(teachingAssignments, eq(teachingAssignments.classId, enrolments.classId))
    .leftJoin(
      subjectScores,
      and(eq(subjectScores.studentId, enrolments.studentId), eq(subjectScores.subjectId, teachingAssignments.subjectId), eq(subjectScores.termId, termId)),
    )
    .where(inArray(enrolments.classId, relevantClassIds))
    .groupBy(enrolments.classId, teachingAssignments.subjectId);
  const counts = new Map(countRows.map((r) => [`${r.classId}|${r.subjectId}`, r]));

  return assignmentRows
    .map(({ assignment, schoolClass, subject }) => {
      const sheet = counts.get(`${schoolClass.id}|${subject.id}`);
      return {
        schoolClass,
        subject,
        teacherId: assignment.teacherId,
        onRoll: sheet?.onRoll ?? 0,
        classScoresEntered: sheet?.classScoresEntered ?? 0,
        examScoresEntered: sheet?.examScoresEntered ?? 0,
      };
    })
    .sort((a, b) => a.schoolClass.yearGroup - b.schoolClass.yearGroup || a.schoolClass.name.localeCompare(b.schoolClass.name) || a.subject.sortOrder - b.subject.sortOrder);
}
