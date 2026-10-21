import type { Term } from './types';

// Ghana statutory public holidays that fall on weekdays in the 2025 to 2027 school years.
const publicHolidays = new Set([
  '2025-09-22', '2025-12-01', '2025-12-25', '2025-12-26', '2026-01-01', '2026-01-07', '2026-03-06',
  '2026-04-03', '2026-04-06', '2026-05-01', '2026-07-01', '2026-09-21', '2026-12-04', '2026-12-25',
  '2027-01-01', '2027-01-07', '2027-03-26', '2027-03-29', '2027-05-01', '2027-07-01',
]);

export function termLabel(term: Pick<Term, 'name' | 'academicYear'>): string {
  return `${term.name} ${term.academicYear}`;
}

export function sortTerms<T extends Pick<Term, 'startsOn'>>(terms: T[]): T[] {
  return [...terms].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export function termsUpTo(terms: Term[], termId: string): Term[] {
  const sorted = sortTerms(terms);
  const index = sorted.findIndex((t) => t.id === termId);
  return sorted.slice(0, index + 1);
}

export function previousTerm(terms: Term[], termId: string): Term | undefined {
  const sorted = sortTerms(terms);
  const index = sorted.findIndex((t) => t.id === termId);
  return index > 0 ? sorted[index - 1] : undefined;
}

export function nextTerm(terms: Term[], termId: string): Term | undefined {
  const sorted = sortTerms(terms);
  const index = sorted.findIndex((t) => t.id === termId);
  return index >= 0 ? sorted[index + 1] : undefined;
}

export function termsOfYear(terms: Term[], academicYear: string): Term[] {
  return sortTerms(terms.filter((t) => t.academicYear === academicYear));
}

export function isSchoolDay(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6 && !publicHolidays.has(isoDate);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// School days are counted in Ghana time (GMT, no daylight saving).
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function schoolDaysBetween(fromIso: string, toIso: string): string[] {
  const days: string[] = [];
  for (let date = fromIso; date <= toIso; date = addDays(date, 1)) {
    if (isSchoolDay(date)) days.push(date);
  }
  return days;
}
