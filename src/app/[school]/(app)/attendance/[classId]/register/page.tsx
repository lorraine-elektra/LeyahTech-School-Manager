import Link from 'next/link';
import { notFound } from 'next/navigation';
import { classSheetsInTerm } from '@/features/attendance/queries';
import { attendanceRate, emptyTotals, addToTotals } from '@/features/attendance/summary';
import type { AttendanceStatus } from '@/features/attendance/types';
import { allow, canViewClass } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { schoolDaysBetween, termLabel, todayIso } from '@/features/school/calendar';
import { getClass } from '@/features/school/queries';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { classRoll } from '@/features/students/queries';
import { formatPercent } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';
import { PrintButton } from '@/ui/PrintButton';

const marks: Record<AttendanceStatus, string> = { present: '/', late: 'L', excused: 'E', absent: 'A' };

export default async function TermRegisterPage({ params }: { params: Promise<{ school: string; classId: string }> }) {
  const { school, classId } = await params;
  const viewer = await requireViewer(school);
  allow(canViewClass(viewer, classId));
  const term = viewer.currentTerm;
  const schoolClass = await getClass(viewer.school.id, classId);
  if (!schoolClass || schoolClass.academicYear !== term.academicYear) notFound();
  const today = todayIso();
  const lastDay = today < term.endsOn ? today : term.endsOn;
  const days = schoolDaysBetween(term.startsOn, lastDay);
  const [{ sheets, entries }, roll] = await Promise.all([classSheetsInTerm(viewer.school.id, classId, term), classRoll(viewer.school.id, classId)]);
  const sheetByDate = new Map(sheets.map((s) => [s.date, s]));
  const statusFor = new Map(entries.map((e) => [`${e.sheetId}|${e.studentId}`, e.status]));
  const missingDays = days.filter((d) => !sheetByDate.has(d));

  return (
    <>
      <PageHeader
        title={`${schoolClass.name} term register`}
        meta={`${termLabel(term)} · ${sheets.length} of ${days.length} school days marked. / present, L late, E excused, A absent.`}
        breadcrumb={<Link href={`/${school}/attendance/${classId}`}>{schoolClass.name} attendance</Link>}
        actions={<PrintButton label="Print register" />}
      />
      {missingDays.length > 0 && (
        <div className="notice notice--info" style={{ marginBottom: 12 }}>
          Not marked on {missingDays.length} days:{' '}
          {missingDays.map((d, i) => (
            <span key={d}>
              {i > 0 && ', '}
              <Link href={`/${school}/attendance/${classId}?date=${d}`}>{d.slice(8)}/{d.slice(5, 7)}</Link>
            </span>
          ))}
          .
        </div>
      )}
      <div className="table-wrap">
        <table className="table register">
          <thead>
            <tr>
              <th>Student</th>
              {days.map((d) => (
                <th key={d} className="register__day" title={d}>
                  {Number(d.slice(8))}
                  <br />
                  <span className="faint">{d.slice(5, 7)}</span>
                </th>
              ))}
              <th className="num">Abs.</th>
              <th className="num">Late</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {roll.map((student) => {
              const totals = emptyTotals();
              const cells = days.map((d) => {
                const sheet = sheetByDate.get(d);
                const status = sheet && statusFor.get(`${sheet.id}|${student.id}`);
                if (status) addToTotals(totals, status);
                return { d, status };
              });
              const rate = attendanceRate(totals);
              return (
                <tr key={student.id} className={student.status !== 'Active' ? 'row-muted' : undefined}>
                  <td className="nowrap">
                    <Link href={`/${school}/students/${admissionNoToSlug(student.admissionNo)}/attendance`}>{studentRegisterName(student)}</Link>
                  </td>
                  {cells.map(({ d, status }) => (
                    <td key={d} className={`register__day ${status === 'absent' ? 'bad' : status === 'late' ? 'warn' : ''}`}>
                      {status ? marks[status] : ''}
                    </td>
                  ))}
                  <td className="num">{totals.absent}</td>
                  <td className="num">{totals.late}</td>
                  <td className={rate !== undefined && rate < 85 ? 'num bad' : 'num'}>{rate === undefined ? '' : formatPercent(rate, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
