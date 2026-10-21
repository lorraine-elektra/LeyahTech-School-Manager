import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Viewer } from '@/features/auth/session';
import { canViewStudent } from './access';
import { slugToAdmissionNo } from './names';
import { getStudentByAdmissionNo } from './queries';

export const loadStudent = cache(async (viewer: Viewer, slug: string) => {
  const row = await getStudentByAdmissionNo(viewer.school.id, slugToAdmissionNo(slug));
  if (!row || !(await canViewStudent(viewer, row.student.id))) notFound();
  return row;
});
