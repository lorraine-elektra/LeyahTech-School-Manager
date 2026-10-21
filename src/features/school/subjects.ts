import type { Programme, SchoolLevel, Subject } from './types';

export function subjectsFor(allSubjects: Subject[], level: SchoolLevel, programme?: string | null): Subject[] {
  return allSubjects
    .filter((s) => s.level === level && (s.core || !s.programmes?.length || (!!programme && s.programmes.includes(programme))))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const programmes: Programme[] = ['Science', 'General Arts', 'Business'];
