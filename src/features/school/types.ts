import type { classes, schools, subjects, teachingAssignments, terms } from '@/db/schema';

export type SchoolLevel = 'JHS' | 'SHS';
export type Programme = 'Science' | 'General Arts' | 'Business';

export type School = typeof schools.$inferSelect;
export type Term = typeof terms.$inferSelect;
export type SchoolClass = typeof classes.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type TeachingAssignment = typeof teachingAssignments.$inferSelect;
