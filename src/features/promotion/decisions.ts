import { PROMOTION_PASS_MARK } from '@/features/school/grading';
import type { SchoolClass } from '@/features/school/types';
import type { EnrolmentOutcome } from '@/features/students/types';

export type PromotionDecision = 'Promoted' | 'Promoted on trial' | 'Repeated' | 'Completed';

// Basic 9 sit the BECE and SHS 3 the WASSCE, so both complete rather than move up.
export function isFinalYear(schoolClass: Pick<SchoolClass, 'yearGroup'>): boolean {
  return schoolClass.yearGroup === 9 || schoolClass.yearGroup === 12;
}

export function proposedDecision(schoolClass: Pick<SchoolClass, 'yearGroup'>, annualAverage: number | null): PromotionDecision | null {
  if (isFinalYear(schoolClass)) return 'Completed';
  if (annualAverage === null) return null;
  return annualAverage >= PROMOTION_PASS_MARK ? 'Promoted' : 'Repeated';
}

export function nextAcademicYear(academicYear: string): string {
  const start = Number(academicYear.slice(0, 4)) + 1;
  return `${start}/${start + 1}`;
}

export function yearGroupLabel(yearGroup: number): string {
  return yearGroup <= 9 ? `Basic ${yearGroup}` : `SHS ${yearGroup - 9}`;
}

// The class a student moves into: same stream or programme, one year group up.
export function nextClassName(schoolClass: Pick<SchoolClass, 'yearGroup' | 'stream' | 'programme'>, decision: PromotionDecision): string | undefined {
  if (decision === 'Completed') return undefined;
  const yearGroup = decision === 'Repeated' ? schoolClass.yearGroup : schoolClass.yearGroup + 1;
  return schoolClass.programme
    ? `${yearGroupLabel(yearGroup)} ${schoolClass.programme}`
    : `${yearGroupLabel(yearGroup)}${schoolClass.stream ?? ''}`;
}

export const decisionOptions: EnrolmentOutcome[] = ['Promoted', 'Promoted on trial', 'Repeated', 'Completed'];
