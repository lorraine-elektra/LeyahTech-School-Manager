import { gradeFor, totalScore, weightedExamScore, type GradeBand } from '@/features/school/grading';
import type { SchoolLevel, Subject } from '@/features/school/types';
import type { Student } from '@/features/students/types';
import type { SubjectScore } from './types';

export interface SubjectResult {
  subject: Subject;
  classScore: number | null;
  examScore: number | null;
  weightedExam: number | null;
  total: number | null;
  grade?: GradeBand;
  position?: number;
}

export interface StudentTermResult {
  student: Student;
  subjects: SubjectResult[];
  overallTotal: number;
  average: number | null;
  position?: number;
  isComplete: boolean;
}

// Tied scores share a position and the next position is skipped (1st, 2nd, 2nd, 4th).
export function rankPositions<T>(items: T[], value: (item: T) => number | null): Map<T, number> {
  const ranked = items.filter((item) => value(item) !== null).sort((a, b) => value(b)! - value(a)!);
  const positions = new Map<T, number>();
  ranked.forEach((item, index) => {
    const previous = ranked[index - 1];
    positions.set(item, previous && value(previous) === value(item) ? positions.get(previous)! : index + 1);
  });
  return positions;
}

export function classTermResults(input: {
  level: SchoolLevel;
  subjects: Subject[];
  students: Student[];
  scores: SubjectScore[];
}): StudentTermResult[] {
  const scoreByKey = new Map(input.scores.map((s) => [`${s.studentId}|${s.subjectId}`, s]));

  const results: StudentTermResult[] = input.students.map((student) => {
    const subjectResults = input.subjects.map<SubjectResult>((subject) => {
      const score = scoreByKey.get(`${student.id}|${subject.id}`);
      const classScore = score?.classScore ?? null;
      const examScore = score?.examScore ?? null;
      const total = classScore !== null && examScore !== null ? totalScore(classScore, examScore) : null;
      return {
        subject,
        classScore,
        examScore,
        weightedExam: examScore !== null ? weightedExamScore(examScore) : null,
        total,
        grade: total !== null ? gradeFor(input.level, total) : undefined,
      };
    });
    const isComplete = subjectResults.every((r) => r.total !== null);
    const overallTotal = subjectResults.reduce((sum, r) => sum + (r.total ?? 0), 0);
    return {
      student,
      subjects: subjectResults,
      overallTotal,
      average: isComplete && subjectResults.length ? Math.round((overallTotal / subjectResults.length) * 10) / 10 : null,
      isComplete,
    };
  });

  const overallPositions = rankPositions(results, (r) => (r.isComplete ? r.overallTotal : null));
  results.forEach((r) => (r.position = overallPositions.get(r)));
  input.subjects.forEach((_, index) => {
    const positions = rankPositions(results, (r) => r.subjects[index].total);
    results.forEach((r) => (r.subjects[index].position = positions.get(r)));
  });
  return results;
}

export function annualAverage(termAverages: (number | null)[]): number | null {
  const known = termAverages.filter((a): a is number => a !== null);
  return known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null;
}
