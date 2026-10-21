import type { AttendanceStatus, AttendanceTotals } from './types';

export const attendanceStatuses: AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
  absent: 'Absent',
};

export function emptyTotals(): AttendanceTotals {
  return { daysOpen: 0, present: 0, late: 0, excused: 0, absent: 0 };
}

export function addToTotals(totals: AttendanceTotals, status: AttendanceStatus): AttendanceTotals {
  totals.daysOpen += 1;
  totals[status] += 1;
  return totals;
}

export function totalsFromStatuses(statuses: AttendanceStatus[]): AttendanceTotals {
  return statuses.reduce(addToTotals, emptyTotals());
}

// Late students were in school, so they count towards attendance.
export function attendanceRate(totals: AttendanceTotals): number | undefined {
  return totals.daysOpen ? ((totals.present + totals.late) / totals.daysOpen) * 100 : undefined;
}
