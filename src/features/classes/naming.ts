import type { Programme } from '@/features/school/types';

export const yearOptions = [7, 8, 9, 10, 11, 12].map((yearGroup) => ({ yearGroup, label: yearGroup <= 9 ? `Basic ${yearGroup}` : `SHS ${yearGroup - 9}` }));

// Matches the names already in use: Basic 7A, SHS 1 Science, SHS 1 Science B.
export function className(yearGroup: number, programme: Programme | null, stream: string | null): string {
  if (yearGroup <= 9) return `Basic ${yearGroup}${stream ?? ''}`;
  return [`SHS ${yearGroup - 9}`, programme, stream].filter(Boolean).join(' ');
}
