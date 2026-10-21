import Link from 'next/link';
import { scoreSheetProgress } from '@/features/assessment/progress';
import { sheetsOnDate } from '@/features/attendance/queries';
import { totalsFromStatuses } from '@/features/attendance/summary';
import type { Viewer } from '@/features/auth/session';
import { summariseCollection } from '@/features/fees/accounts';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { isSchoolDay, termLabel, todayIso } from '@/features/school/calendar';
import { getClasses, getStaff } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { recentMovements } from '@/features/students/movements';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { listStudents, isEnrolledOn } from '@/features/students/queries';
import { formatDate, formatDateWithDay, formatMoney, formatPercent, formatTime } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';

export async function HeadteacherOverview({ viewer }: { viewer: Viewer }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const { academicYear } = viewer.currentTerm;
  const [classes, staff, sheets, feeRows, progress, movements, roll] = await Promise.all([
    getClasses(viewer.school.id, academicYear),
    getStaff(viewer.school.id),
    sheetsOnDate(viewer.school.id, today),
    schoolFeeAccounts(viewer),
    scoreSheetProgress(viewer),
    recentMovements(viewer.school.id, 8),
    listStudents(viewer.school.id, academicYear),
  ]);
  const collection = summariseCollection(feeRows.map((r) => r.account));

  return (
    <>
      <PageHeader title="Overview" meta={`${termLabel(viewer.currentTerm)} · ${formatDateWithDay(today)}`} />

      <Section title="Attendance today" aside={isSchoolDay(today) ? undefined : 'Not a school day'}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Class teacher</th>
                <th className="num">On roll</th>
                <th className="num">Present</th>
                <th className="num">Late</th>
                <th className="num">Excused</th>
                <th className="num">Absent</th>
                <th>Marked</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((schoolClass) => {
                const sheet = sheets.find((s) => s.classId === schoolClass.id);
                const counts = sheet && totalsFromStatuses(sheet.entries.map((e) => e.status));
                const onRoll = roll.filter((r) => r.schoolClass?.id === schoolClass.id && isEnrolledOn(r.student, today)).length;
                return (
                  <tr key={schoolClass.id}>
                    <td>
                      <Link href={`${base}/attendance/${schoolClass.id}`}>{schoolClass.name}</Link>
                    </td>
                    <td>{staffName(staff.find((s) => s.id === schoolClass.classTeacherId))}</td>
                    <td className="num">{onRoll}</td>
                    <td className="num">{counts?.present ?? ''}</td>
                    <td className="num">{counts?.late ?? ''}</td>
                    <td className="num">{counts?.excused ?? ''}</td>
                    <td className="num">{counts?.absent ?? ''}</td>
                    <td>{sheet ? <span className="muted">{formatTime(sheet.markedAt)}</span> : <span className="warn">Not marked</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Fees this term" aside={<Link href={`${base}/fees`}>Fee accounts</Link>}>
        <div className="panel panel--padded">
          Collected <strong className="mono">{formatMoney(collection.collected)}</strong> of{' '}
          <span className="mono">{formatMoney(collection.due)}</span> due (term fees and arrears, less scholarships), which is{' '}
          {formatPercent(collection.due ? (collection.collected / collection.due) * 100 : 0)}.{' '}
          <span className="mono">{collection.studentsOwing}</span> students still owe{' '}
          <span className="mono">{formatMoney(collection.outstanding)}</span>.
        </div>
      </Section>

      <Section title="Score entry" aside="Class scores for this term">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th className="num">Subjects</th>
                <th className="num">Complete</th>
                <th className="num">Started</th>
                <th className="num">Not started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((schoolClass) => {
                const sheetsForClass = progress.filter((p) => p.schoolClass.id === schoolClass.id);
                const complete = sheetsForClass.filter((p) => p.onRoll > 0 && p.classScoresEntered === p.onRoll).length;
                const notStarted = sheetsForClass.filter((p) => p.classScoresEntered === 0).length;
                return (
                  <tr key={schoolClass.id}>
                    <td>{schoolClass.name}</td>
                    <td className="num">{sheetsForClass.length}</td>
                    <td className="num">{complete}</td>
                    <td className="num">{sheetsForClass.length - complete - notStarted}</td>
                    <td className={notStarted ? 'num bad' : 'num'}>{notStarted}</td>
                    <td>
                      <Link href={`${base}/scores?class=${schoolClass.id}`}>View sheets</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Recent admissions and exits" aside={<Link href={`${base}/movements`}>All records</Link>}>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {movements.map(({ movement, student }) => (
                <tr key={movement.id}>
                  <td className="nowrap">{formatDate(movement.date)}</td>
                  <td className="nowrap">{movement.kind}</td>
                  <td className="nowrap">
                    <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                  </td>
                  <td className="muted">{movement.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
