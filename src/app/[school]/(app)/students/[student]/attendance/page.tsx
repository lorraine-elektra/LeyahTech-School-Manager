import { and, between, desc, eq, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendanceEntries, attendanceSheets } from '@/db/schema';
import { termAttendanceTotals } from '@/features/attendance/queries';
import { attendanceRate, attendanceStatusLabels } from '@/features/attendance/summary';
import { allow, canViewAcademics } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { loadStudent } from '@/features/students/loadStudent';
import { formatDateWithDay, formatPercent } from '@/ui/format';
import { Section } from '@/ui/Section';
import { Tag } from '@/ui/Tag';

export default async function StudentAttendancePage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  allow(canViewAcademics(viewer));
  const { student } = await loadStudent(viewer, slug);
  const term = viewer.currentTerm;
  const pastTerms = termsUpTo(viewer.terms, term.id).reverse();
  const totalsByTerm = await Promise.all(pastTerms.map(async (t) => ({ term: t, totals: (await termAttendanceTotals(viewer.school.id, t, [student.id])).get(student.id) })));
  const notPresent = await db
    .select({ date: attendanceSheets.date, status: attendanceEntries.status, note: attendanceEntries.note })
    .from(attendanceEntries)
    .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceEntries.sheetId))
    .where(and(eq(attendanceEntries.studentId, student.id), ne(attendanceEntries.status, 'present'), between(attendanceSheets.date, term.startsOn, term.endsOn)))
    .orderBy(desc(attendanceSheets.date));

  return (
    <>
      <Section title="By term">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Term</th>
                <th className="num">Days</th>
                <th className="num">Present</th>
                <th className="num">Late</th>
                <th className="num">Excused</th>
                <th className="num">Absent</th>
                <th className="num">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {totalsByTerm
                .filter((row) => row.totals && row.totals.daysOpen > 0)
                .map(({ term: t, totals }) => (
                  <tr key={t.id}>
                    <td>
                      {termLabel(t)}
                      {t.id === term.id && <span className="muted"> · so far</span>}
                    </td>
                    <td className="num">{totals!.daysOpen}</td>
                    <td className="num">{totals!.present}</td>
                    <td className="num">{totals!.late}</td>
                    <td className="num">{totals!.excused}</td>
                    <td className="num">{totals!.absent}</td>
                    <td className="num">{formatPercent(attendanceRate(totals!)!)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={`Late, excused and absent days in ${termLabel(term)}`}>
        <div className="table-wrap">
          {notPresent.length === 0 ? (
            <p className="empty">Present every day marked this term.</p>
          ) : (
            <table className="table">
              <tbody>
                {notPresent.map((day) => (
                  <tr key={day.date}>
                    <td className="nowrap" style={{ width: 160 }}>{formatDateWithDay(day.date)}</td>
                    <td style={{ width: 100 }}>
                      <Tag tone={day.status === 'absent' ? 'bad' : day.status === 'late' ? 'warn' : 'neutral'}>{attendanceStatusLabels[day.status]}</Tag>
                    </td>
                    <td className="muted">{day.note}</td>
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
