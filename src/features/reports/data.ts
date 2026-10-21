import 'server-only';
import { notFound } from 'next/navigation';
import { classTermResults, type StudentTermResult } from '@/features/assessment/results';
import { termRemarks, termScores } from '@/features/assessment/queries';
import { termAttendanceTotals } from '@/features/attendance/queries';
import type { AttendanceTotals } from '@/features/attendance/types';
import type { Viewer } from '@/features/auth/session';
import { nextTerm } from '@/features/school/calendar';
import { getClass, getStaff, getSubjects } from '@/features/school/queries';
import { subjectsFor } from '@/features/school/subjects';
import type { SchoolClass, Subject, Term } from '@/features/school/types';
import type { StaffMember } from '@/features/staff/types';
import { classRoll } from '@/features/students/queries';
import type { ReportRemarks } from './types';

export interface ClassReports {
  term: Term;
  schoolClass: SchoolClass;
  subjects: Subject[];
  results: StudentTermResult[];
  remarks: Map<string, ReportRemarks>;
  attendance: Map<string, AttendanceTotals>;
  classTeacher?: StaffMember;
  headteacher?: StaffMember;
  nextTermBegins?: string;
}

export function resolveTerm(viewer: Viewer, termId: string | undefined): Term {
  const term = termId ? viewer.terms.find((t) => t.id === termId) : viewer.currentTerm;
  if (!term || term.startsOn > viewer.currentTerm.startsOn) notFound();
  return term;
}

export async function loadClassReports(viewer: Viewer, classId: string, term: Term): Promise<ClassReports> {
  const schoolId = viewer.school.id;
  const schoolClass = await getClass(schoolId, classId);
  if (!schoolClass || schoolClass.academicYear !== term.academicYear) notFound();

  const roll = (await classRoll(schoolId, classId)).filter(
    (s) => s.admittedOn <= term.endsOn && (!s.exitedOn || s.exitedOn > term.startsOn),
  );
  const ids = roll.map((s) => s.id);
  const [allSubjects, scores, remarkRows, attendance, staff] = await Promise.all([
    getSubjects(schoolId),
    termScores(schoolId, term.id, ids),
    termRemarks(schoolId, term.id, ids),
    termAttendanceTotals(schoolId, term, ids),
    getStaff(schoolId),
  ]);
  const scoredIds = new Set(scores.map((s) => s.studentId));
  // A student who left mid-term without sitting any assessment gets no report for that term.
  const students = roll.filter((s) => !s.exitedOn || s.exitedOn > term.endsOn || scoredIds.has(s.id));
  const subjects = subjectsFor(allSubjects, schoolClass.level, schoolClass.programme);

  return {
    term,
    schoolClass,
    subjects,
    results: classTermResults({ level: schoolClass.level, subjects, students, scores }),
    remarks: new Map(remarkRows.map((r) => [r.studentId, r])),
    attendance,
    classTeacher: staff.find((s) => s.id === schoolClass.classTeacherId),
    headteacher: staff.find((s) => s.position === 'Headteacher'),
    nextTermBegins: nextTerm(viewer.terms, term.id)?.startsOn,
  };
}
