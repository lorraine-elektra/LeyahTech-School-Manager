import Link from 'next/link';
import { notFound } from 'next/navigation';
import { classSheet } from '@/features/attendance/queries';
import { saveAttendance } from '@/features/attendance/actions';
import { AttendanceSheetForm } from '@/features/attendance/AttendanceSheetForm';
import { allow, canMarkAttendance, canViewClass } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { addDays, isSchoolDay, todayIso } from '@/features/school/calendar';
import { getClass, getStaff } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { studentRegisterName } from '@/features/students/names';
import { classRoll, isEnrolledOn } from '@/features/students/queries';
import { formatDateWithDay, formatTime } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';

function adjacentSchoolDay(date: string, direction: 1 | -1): string {
  let day = addDays(date, direction);
  while (!isSchoolDay(day)) day = addDays(day, direction);
  return day;
}

export default async function MarkAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string; classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { school, classId } = await params;
  const viewer = await requireViewer(school);
  allow(canViewClass(viewer, classId));
  const schoolClass = await getClass(viewer.school.id, classId);
  if (!schoolClass || schoolClass.academicYear !== viewer.currentTerm.academicYear) notFound();
  const today = todayIso();
  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const [sheet, roll, staff] = await Promise.all([classSheet(viewer.school.id, classId, date), classRoll(viewer.school.id, classId), getStaff(viewer.school.id)]);
  const onRoll = roll.filter((s) => isEnrolledOn(s, date));
  const isMarker = canMarkAttendance(viewer, classId);
  const term = viewer.currentTerm;
  const markable = isMarker && date <= today && date >= term.startsOn && date <= term.endsOn && isSchoolDay(date);

  return (
    <>
      <PageHeader
        title={`${schoolClass.name} attendance`}
        meta={
          <>
            {formatDateWithDay(date)} ·{' '}
            {sheet ? `Marked at ${formatTime(sheet.markedAt)} by ${staffName(staff.find((s) => s.id === sheet.markedBy))}` : 'Not marked'}
          </>
        }
        breadcrumb={viewer.role === 'headteacher' && <Link href={`/${school}/attendance?date=${date}`}>Attendance</Link>}
        actions={
          <Link className="button" href={`/${school}/attendance/${classId}/register`}>
            Term register
          </Link>
        }
      />
      <form method="get" className="table-toolbar">
        <Link className="button" href={`?date=${adjacentSchoolDay(date, -1)}`}>
          Previous day
        </Link>
        <input type="date" name="date" defaultValue={date} min={term.startsOn} max={today} />
        <button className="button" type="submit">
          Go
        </button>
        {date < today && (
          <Link className="button" href={`?date=${adjacentSchoolDay(date, 1) > today ? today : adjacentSchoolDay(date, 1)}`}>
            Next day
          </Link>
        )}
      </form>
      {!isSchoolDay(date) ? (
        <p className="panel empty">This date is a weekend or public holiday. Choose a school day.</p>
      ) : !sheet && !markable ? (
        <p className="panel empty">
          {isMarker ? 'Attendance can only be marked for school days this term, up to today.' : 'The class teacher has not marked attendance for this day.'}
        </p>
      ) : (
        <AttendanceSheetForm
          key={`${classId}-${date}-${sheet?.markedAt ?? ''}`}
          action={saveAttendance.bind(null, school, classId, date)}
          readOnly={!markable}
          alreadyMarked={!!sheet}
          roll={onRoll.map((student) => {
            const entry = sheet?.entries.find((e) => e.studentId === student.id);
            return { studentId: student.id, admissionNo: student.admissionNo, name: studentRegisterName(student), status: entry?.status, note: entry?.note };
          })}
        />
      )}
    </>
  );
}
