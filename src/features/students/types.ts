import type { enrolments, guardians, studentMovements, students } from '@/db/schema';

export type Student = typeof students.$inferSelect;
export type StudentStatus = Student['status'];
export type Gender = Student['gender'];
export type Guardian = typeof guardians.$inferSelect;
export type Enrolment = typeof enrolments.$inferSelect;
export type EnrolmentOutcome = NonNullable<Enrolment['outcome']>;
export type StudentMovement = typeof studentMovements.$inferSelect;
export type MovementKind = StudentMovement['kind'];
