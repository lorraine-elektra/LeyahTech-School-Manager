import type { Student } from './types';

type NamedStudent = Pick<Student, 'firstName' | 'otherNames' | 'surname'>;

export function studentFullName(student: NamedStudent): string {
  return [student.firstName, student.otherNames, student.surname].filter(Boolean).join(' ');
}

export function studentRegisterName(student: NamedStudent): string {
  return `${student.surname}, ${[student.firstName, student.otherNames].filter(Boolean).join(' ')}`;
}

export function compareBySurname(a: NamedStudent, b: NamedStudent): number {
  return a.surname.localeCompare(b.surname) || a.firstName.localeCompare(b.firstName);
}

// Admission numbers contain slashes (STU/2026/0143), so URLs use dashes.
export function admissionNoToSlug(admissionNo: string): string {
  return admissionNo.replace(/\//g, '-');
}

export function slugToAdmissionNo(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, '/');
}
