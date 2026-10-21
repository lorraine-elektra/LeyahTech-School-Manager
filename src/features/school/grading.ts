import type { SchoolLevel } from './types';

export interface GradeBand {
  minScore: number;
  grade: string;
  remark: string;
}

export const CLASS_SCORE_MAX = 30;
export const EXAM_SCORE_MAX = 100;
export const EXAM_WEIGHT = 0.7;

// BECE grading, used for school-based assessment at JHS.
const jhsGradeBands: GradeBand[] = [
  { minScore: 80, grade: '1', remark: 'Highest' },
  { minScore: 70, grade: '2', remark: 'Higher' },
  { minScore: 60, grade: '3', remark: 'High' },
  { minScore: 55, grade: '4', remark: 'High Average' },
  { minScore: 50, grade: '5', remark: 'Average' },
  { minScore: 45, grade: '6', remark: 'Low Average' },
  { minScore: 40, grade: '7', remark: 'Low' },
  { minScore: 35, grade: '8', remark: 'Lower' },
  { minScore: 0, grade: '9', remark: 'Lowest' },
];

// WASSCE grading.
const shsGradeBands: GradeBand[] = [
  { minScore: 75, grade: 'A1', remark: 'Excellent' },
  { minScore: 70, grade: 'B2', remark: 'Very Good' },
  { minScore: 65, grade: 'B3', remark: 'Good' },
  { minScore: 60, grade: 'C4', remark: 'Credit' },
  { minScore: 55, grade: 'C5', remark: 'Credit' },
  { minScore: 50, grade: 'C6', remark: 'Credit' },
  { minScore: 45, grade: 'D7', remark: 'Pass' },
  { minScore: 40, grade: 'E8', remark: 'Pass' },
  { minScore: 0, grade: 'F9', remark: 'Fail' },
];

export function gradeBandsFor(level: SchoolLevel): GradeBand[] {
  return level === 'JHS' ? jhsGradeBands : shsGradeBands;
}

export function gradeFor(level: SchoolLevel, totalScore: number): GradeBand {
  return gradeBandsFor(level).find((band) => totalScore >= band.minScore)!;
}

export function weightedExamScore(examScore: number): number {
  return Math.round(examScore * EXAM_WEIGHT * 10) / 10;
}

export function totalScore(classScore: number, examScore: number): number {
  return Math.round(classScore + examScore * EXAM_WEIGHT);
}

export const PROMOTION_PASS_MARK = 45;
