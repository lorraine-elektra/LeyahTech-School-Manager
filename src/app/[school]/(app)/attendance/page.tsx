import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sheetsOnDate } from '@/features/attendance/queries';
import { totalsFromStatuses, attendanceRate } from '@/features/attendance/summary';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { isSchoolDay, todayIso } from '@/features/school/calendar';
import { getClasses, getStaff } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { formatDateWithDay, formatPercent, formatTime } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';

export default async function AttendancePage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ date?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  if (viewer.ownClassId) redirect(`/${school}/attendance/${viewer.ownClassId}`);
  allow(viewer.role === 'headteacher');
  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIso();
  const [classes, sheets, staff] = await Promise.all([
    getClasses(viewer.school.id, viewer.currentTerm.academicYear),
    sheetsOnDate(viewer.school.id, date),
    getStaff(viewer.school.id),
  ]);
  const schoolTotals = totalsFromStatuses(sheets.flatMap((s) => s.entries.map((e) => e.status)));

  return (
    <>
      <PageHeader
        title="Attendance"
        meta={`${formatDateWithDay(date)}${sheets.length ? ` · ${formatPercent(attendanceRate(schoolTotals) ?? 0)} of marked students in school` : ''}`}
      />
      <form method="get" className="table-toolbar">
        <input type="date" name="date" defaultValue={date} max={todayIso()} />
        <button className="button" type="submit">
          Go
        </button>
      </form>
      {!isSchoolDay(date) ? (
        <p className="panel empty">This date is a weekend or public holiday.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Class teacher</th>
                <th className="num">Marked</th>
                <th className="num">Present</th>
                <th className="num">Late</th>
                <th className="num">Excused</th>
                <th className="num">Absent</th>
                <th className="num">In school</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((schoolClass) => {
                const sheet = sheets.find((s) => s.classId === schoolClass.id);
                const totals = sheet && totalsFromStatuses(sheet.entries.map((e) => e.status));
                return (
                  <tr key={schoolClass.id}>
                    <td>{schoolClass.name}</td>
                    <td>{staffName(staff.find((s) => s.id === schoolClass.classTeacherId))}</td>
                    <td className="num">{sheet ? formatTime(sheet.markedAt) : <span className="warn">Not marked</span>}</td>
                    <td className="num">{totals?.present ?? ''}</td>
                    <td className="num">{totals?.late ?? ''}</td>
                    <td className="num">{totals?.excused ?? ''}</td>
                    <td className="num">{totals?.absent ?? ''}</td>
                    <td className="num">{totals ? formatPercent(attendanceRate(totals) ?? 0) : ''}</td>
                    <td className="nowrap">
                      <Link href={`/${school}/attendance/${schoolClass.id}?date=${date}`}>View</Link> ·{' '}
                      <Link href={`/${school}/attendance/${schoolClass.id}/register`}>Register</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
