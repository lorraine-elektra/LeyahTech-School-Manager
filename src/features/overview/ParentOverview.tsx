import Link from 'next/link';
import { termAttendanceTotals } from '@/features/attendance/queries';
import { attendanceRate } from '@/features/attendance/summary';
import type { Viewer } from '@/features/auth/session';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { termLabel } from '@/features/school/calendar';
import { visibleStudentIds } from '@/features/students/access';
import { admissionNoToSlug, studentFullName } from '@/features/students/names';
import { listStudents } from '@/features/students/queries';
import { formatBalance, formatPercent } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';

export async function ParentOverview({ viewer }: { viewer: Viewer }) {
  const base = `/${viewer.school.slug}`;
  const scope = await visibleStudentIds(viewer);
  const childIds = scope === 'all' ? [] : scope;
  const [children, feeRows, attendance] = await Promise.all([
    listStudents(viewer.school.id, viewer.currentTerm.academicYear, childIds),
    schoolFeeAccounts(viewer, viewer.currentTerm.id, childIds),
    termAttendanceTotals(viewer.school.id, viewer.currentTerm, childIds),
  ]);

  return (
    <>
      <PageHeader title="My children" meta={termLabel(viewer.currentTerm)} />
      <div className="table-wrap">
        {children.length === 0 ? (
          <p className="empty">No students are linked to your account. Contact the school office to link your children.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no.</th>
                <th>Class</th>
                <th className="num">Attendance this term</th>
                <th className="num">Fee balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {children.map(({ student, schoolClass }) => {
                const slug = admissionNoToSlug(student.admissionNo);
                const totals = attendance.get(student.id);
                const rate = totals && attendanceRate(totals);
                const balance = feeRows.find((r) => r.student.id === student.id)?.account.balance ?? 0;
                return (
                  <tr key={student.id}>
                    <td>
                      <Link href={`${base}/students/${slug}`}>{studentFullName(student)}</Link>
                    </td>
                    <td className="mono">{student.admissionNo}</td>
                    <td>{schoolClass?.name}</td>
                    <td className="num">{rate === undefined ? '' : formatPercent(rate)}</td>
                    <td className={balance > 0 ? 'num bad' : 'num'}>{formatBalance(balance)}</td>
                    <td className="nowrap">
                      <Link href={`${base}/students/${slug}/results`}>Report cards</Link> ·{' '}
                      <Link href={`${base}/students/${slug}/fees`}>Fees</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
