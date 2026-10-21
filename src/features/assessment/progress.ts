import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
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

  const rollRows = await db
    .select({ classId: enrolments.classId, studentId: enrolments.studentId })
    .from(enrolments)
    .innerJoin(students, eq(students.id, enrolments.studentId))
    .where(and(inArray(enrolments.classId, relevantClassIds), eq(students.status, 'Active')));
  const scoreRows = await db
    .select({ studentId: subjectScores.studentId, subjectId: subjectScores.subjectId, classScore: subjectScores.classScore, examScore: subjectScores.examScore })
    .from(subjectScores)
    .where(and(eq(subjectScores.schoolId, schoolId), eq(subjectScores.termId, termId)));

  const scoreIndex = new Map(scoreRows.map((s) => [`${s.studentId}|${s.subjectId}`, s]));
  return assignmentRows
    .map(({ assignment, schoolClass, subject }) => {
      const roll = rollRows.filter((r) => r.classId === schoolClass.id);
      const sheetScores = roll.map((r) => scoreIndex.get(`${r.studentId}|${subject.id}`)).filter((s) => s !== undefined);
      return {
        schoolClass,
        subject,
        teacherId: assignment.teacherId,
        onRoll: roll.length,
        classScoresEntered: sheetScores.filter((s) => s.classScore !== null).length,
        examScoresEntered: sheetScores.filter((s) => s.examScore !== null).length,
      };
    })
    .sort((a, b) => a.schoolClass.yearGroup - b.schoolClass.yearGroup || a.schoolClass.name.localeCompare(b.schoolClass.name) || a.subject.sortOrder - b.subject.sortOrder);
}
