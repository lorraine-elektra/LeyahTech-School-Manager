import { notFound } from 'next/navigation';
import type { Viewer } from './session';

export const canViewFees = (viewer: Viewer) => ['headteacher', 'bursar', 'parent'].includes(viewer.role);
export const canManageFees = (viewer: Viewer) => viewer.role === 'bursar' || viewer.role === 'headteacher';
export const canRecordPayments = (viewer: Viewer) => viewer.role === 'bursar';
export const canAdmitStudents = (viewer: Viewer) => viewer.role === 'headteacher' || viewer.role === 'bursar';
export const canRecordExits = (viewer: Viewer) => viewer.role === 'headteacher';
export const canManagePromotion = (viewer: Viewer) => viewer.role === 'headteacher';
export const canViewAcademics = (viewer: Viewer) => viewer.role !== 'bursar';
export const isOfficeStaff = (viewer: Viewer) => viewer.role === 'headteacher' || viewer.role === 'bursar';

export const canMarkAttendance = (viewer: Viewer, classId: string) => viewer.ownClassId === classId;

export const canEnterScores = (viewer: Viewer, classId: string, subjectId: string) =>
  viewer.assignments.some((a) => a.classId === classId && a.subjectId === subjectId);

export const canWriteHeadteacherRemarks = (viewer: Viewer) => viewer.role === 'headteacher';

// Teachers see only classes they teach or lead this year; office staff see all.
export function canViewClass(viewer: Viewer, classId: string): boolean {
  if (viewer.role === 'headteacher') return true;
  if (viewer.role === 'bursar' || viewer.role === 'parent') return false;
  return viewer.ownClassId === classId || viewer.assignments.some((a) => a.classId === classId);
}

export function teachingClassIds(viewer: Viewer): string[] {
  const ids = new Set(viewer.assignments.map((a) => a.classId));
  if (viewer.ownClassId) ids.add(viewer.ownClassId);
  return [...ids];
}

export function allow(condition: boolean): void {
  if (!condition) notFound();
}
