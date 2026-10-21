import 'server-only';
import { annualAverage } from '@/features/assessment/results';
import type { Viewer } from '@/features/auth/session';
import { loadClassReports } from '@/features/reports/data';
import { termsOfYear } from '@/features/school/calendar';
import type { SchoolClass, Term } from '@/features/school/types';
import type { Student } from '@/features/students/types';
import { db } from '@/db/client';
import { enrolments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { proposedDecision, type PromotionDecision } from './decisions';

export interface PromotionRow {
  student: Student;
  termAverages: (number | null)[];
  annualAverage: number | null;
  proposed: PromotionDecision | null;
  recorded: string | null;
}

export async function promotionRows(viewer: Viewer, schoolClass: SchoolClass): Promise<{ terms: Term[]; rows: PromotionRow[] }> {
  const terms = termsOfYear(viewer.terms, schoolClass.academicYear).filter((t) => t.startsOn <= viewer.currentTerm.startsOn);
  const reports = await Promise.all(terms.map((term) => loadClassReports(viewer, schoolClass.id, term)));
  const outcomes = new Map((await db.select().from(enrolments).where(eq(enrolments.classId, schoolClass.id))).map((e) => [e.studentId, e.outcome]));
  const students = new Map<string, Student>();
  reports.forEach((r) => r.results.forEach((result) => students.set(result.student.id, result.student)));

  const rows = [...students.values()]
    .filter((student) => student.status === 'Active' || ['Promoted', 'Promoted on trial', 'Repeated', 'Completed'].includes(outcomes.get(student.id) ?? ''))
    .map((student) => {
      const termAverages = reports.map((r) => r.results.find((result) => result.student.id === student.id)?.average ?? null);
      const average = annualAverage(termAverages);
      return { student, termAverages, annualAverage: average, proposed: proposedDecision(schoolClass, average), recorded: outcomes.get(student.id) ?? null };
    })
    .sort((a, b) => a.student.surname.localeCompare(b.student.surname) || a.student.firstName.localeCompare(b.student.firstName));
  return { terms, rows };
}
