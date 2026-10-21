import type { attendanceEntries, attendanceSheets, attendanceSummaries } from '@/db/schema';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';
export type AttendanceSheet = typeof attendanceSheets.$inferSelect;
export type AttendanceEntry = typeof attendanceEntries.$inferSelect;
export type AttendanceSummary = typeof attendanceSummaries.$inferSelect;
export type AttendanceTotals = Pick<AttendanceSummary, 'daysOpen' | 'present' | 'late' | 'excused' | 'absent'>;
