import type { AttendanceEntry, AttendanceSheet, AttendanceSummary } from '@/features/attendance/types';
import type { SubjectScore } from '@/features/assessment/types';
import type { FeeItem, FeePayment, OpeningBalance, Scholarship } from '@/features/fees/types';
import type { ReportRemarks } from '@/features/reports/types';
import type { School, SchoolClass, Subject, TeachingAssignment, Term } from '@/features/school/types';
import type { StaffMember } from '@/features/staff/types';
import type { Enrolment, Guardian, Student, StudentMovement } from '@/features/students/types';

// Rows are built with readable local ids and this placeholder school id; the loader swaps both for real ids.
export const SEED_SCHOOL_ID = 'seed-school';

export interface SeedAccount {
  username: string;
  password: string;
  staffId: string | null;
  guardianId: string | null;
}

export interface SeedDataset {
  school: Omit<School, 'id' | 'createdAt'>;
  terms: Term[];
  subjects: Subject[];
  staff: StaffMember[];
  accounts: SeedAccount[];
  classes: SchoolClass[];
  teachingAssignments: TeachingAssignment[];
  students: Student[];
  guardians: Guardian[];
  enrolments: Enrolment[];
  movements: StudentMovement[];
  attendanceSheets: AttendanceSheet[];
  attendanceEntries: AttendanceEntry[];
  attendanceSummaries: AttendanceSummary[];
  scores: SubjectScore[];
  reportRemarks: ReportRemarks[];
  feeItems: FeeItem[];
  scholarships: Scholarship[];
  payments: FeePayment[];
  openingBalances: OpeningBalance[];
}
