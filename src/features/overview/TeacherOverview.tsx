import Link from 'next/link';
import { ScoreSheetTable } from '@/features/assessment/ScoreSheetTable';
import { scoreSheetProgress } from '@/features/assessment/progress';
import { classSheet, termAttendanceTotals } from '@/features/attendance/queries';
import { attendanceRate, totalsFromStatuses } from '@/features/attendance/summary';
import type { Viewer } from '@/features/auth/session';
import { isSchoolDay, termLabel, todayIso } from '@/features/school/calendar';
import { getClass } from '@/features/school/queries';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { classRoll } from '@/features/students/queries';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { formatDateWithDay, formatPercent, formatTime } from '@/ui/format';
import { greeting } from './greeting';

const LOW_ATTENDANCE = 85;

export async function TeacherOverview({ viewer }: { viewer: Viewer }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const sheets = await scoreSheetProgress(viewer, undefined, viewer.staff!.id);

  return (
    <>
      <PageHeader title={`Good ${greeting()}, ${viewer.staff?.title} ${viewer.staff?.surname}`} meta={`${termLabel(viewer.currentTerm)} · ${formatDateWithDay(today)}`} />
      {viewer.ownClassId && <OwnClassSummary viewer={viewer} classId={viewer.ownClassId} today={today} />}
      <Section title="My score sheets" icon="scores" aside="Class scores out of 30, exams out of 100">
        <ScoreSheetTable base={base} sheets={sheets} />
      </Section>
    </>
  );
}

async function OwnClassSummary({ viewer, classId, today }: { viewer: Viewer; classId: string; today: string }) {
  const base = `/${viewer.school.slug}`;
  const [schoolClass, sheet, roll] = await Promise.all([
    getClass(viewer.school.id, classId),
    classSheet(viewer.school.id, classId, today),
    classRoll(viewer.school.id, classId),
  ]);
  const active = roll.filter((s) => s.status === 'Active');
  const totals = await termAttendanceTotals(viewer.school.id, viewer.currentTerm, active.map((s) => s.id));
  const lowAttendance = active
    .map((student) => ({ student, totals: totals.get(student.id), rate: attendanceRate(totals.get(student.id) ?? { daysOpen: 0, present: 0, late: 0, excused: 0, absent: 0 }) }))
    .filter((row) => row.rate !== undefined && row.rate < LOW_ATTENDANCE)
    .sort((a, b) => a.rate! - b.rate!);
  const counts = sheet && totalsFromStatuses(sheet.entries.map((e) => e.status));

  return (
    <>
      <Section title={`${schoolClass?.name} attendance today`} icon="attendance">
        <div className="panel panel--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          {!isSchoolDay(today) ? (
            <span className="muted">Not a school day.</span>
          ) : sheet && counts ? (
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted">Marked at {formatTime(sheet.markedAt)}</span>
              <span className="tag tag--good">{counts.present} present</span>
              <span className="tag tag--warn">{counts.late} late</span>
              <span className="tag tag--info">{counts.excused} excused</span>
              <span className="tag tag--bad">{counts.absent} absent</span>
            </span>
          ) : (
            <span className="tag tag--warn">Attendance has not been marked today</span>
          )}
          <Link className={sheet ? 'button' : 'button button--primary'} href={`${base}/attendance/${classId}`}>
            <Icon name="attendance" /> {sheet ? 'Edit attendance' : 'Mark attendance'}
          </Link>
        </div>
      </Section>

      <Section title={`Attendance below ${LOW_ATTENDANCE}% this term`} icon="alert" aside={<Link href={`${base}/attendance/${classId}/register`}>Term register</Link>}>
        <div className="table-wrap">
          {lowAttendance.length === 0 ? (
            <EmptyState icon="done">No student in this class is below {LOW_ATTENDANCE}% attendance this term.</EmptyState>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="num">Days</th>
                  <th className="num">Absent</th>
                  <th className="num">Excused</th>
                  <th className="num">Late</th>
                  <th className="num">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {lowAttendance.map(({ student, totals: studentTotals, rate }) => (
                  <tr key={student.id}>
                    <td>
                      <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                    </td>
                    <td className="num">{studentTotals?.daysOpen}</td>
                    <td className="num">{studentTotals?.absent}</td>
                    <td className="num">{studentTotals?.excused}</td>
                    <td className="num">{studentTotals?.late}</td>
                    <td className="num bad">{formatPercent(rate!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
