import { studentFullName } from '@/features/students/names';
import type { FeeAccountRow } from './queries';

export interface FeeAccountFilters {
  term?: string;
  class?: string;
  standing?: string;
  q?: string;
  page?: string;
}

export const standingOptions = [
  ['all', 'All students'],
  ['owing', 'Owing'],
  ['arrears', 'Owing from earlier terms'],
  ['paid', 'Fully paid'],
  ['former', 'Former students owing'],
] as const;

export function filterFeeAccounts(rows: FeeAccountRow[], filters: FeeAccountFilters): FeeAccountRow[] {
  const standing = filters.standing ?? 'all';
  const query = filters.q?.trim().toLowerCase();
  return rows
    .filter(({ student, schoolClass, account }) => {
      if (filters.class && schoolClass?.id !== filters.class) return false;
      if (query && !studentFullName(student).toLowerCase().includes(query) && !student.admissionNo.toLowerCase().includes(query)) return false;
      if (standing === 'owing') return account.balance > 0;
      if (standing === 'arrears') return account.arrearsBroughtForward > account.paid && account.balance > 0;
      if (standing === 'paid') return account.balance <= 0;
      if (standing === 'former') return student.status !== 'Active' && account.balance > 0;
      return true;
    })
    .sort((a, b) => (a.schoolClass?.name ?? 'zz').localeCompare(b.schoolClass?.name ?? 'zz') || a.student.surname.localeCompare(b.student.surname));
}
