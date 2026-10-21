import type { Viewer } from '@/features/auth/session';
import type { SchoolClass } from '@/features/school/types';

// Headteachers see every class; class teachers see the classes they lead, including past years.
export function canViewClassReports(viewer: Viewer, schoolClass: SchoolClass): boolean {
  return viewer.role === 'headteacher' || (!!viewer.staff && schoolClass.classTeacherId === viewer.staff.id);
}
