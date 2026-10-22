import Link from 'next/link';
import { termAttendanceTotals } from '@/features/attendance/queries';
import { attendanceRate } from '@/features/attendance/summary';
import type { Viewer } from '@/features/auth/session';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { termLabel } from '@/features/school/calendar';
import { visibleStudentIds } from '@/features/students/access';
import { admissionNoToSlug, studentFullName } from '@/features/students/names';
import { listStudents } from '@/features/students/queries';
import { Avatar } from '@/ui/Avatar';
import { Meter, toneForRate } from '@/ui/Charts';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { formatBalance, formatMoney, formatPercent } from '@/ui/format';

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
      <PageHeader title="My children" meta={`${viewer.school.name} · ${termLabel(viewer.currentTerm)}`} />
      {children.length === 0 ? (
        <div className="panel">
          <EmptyState icon="students">No students are linked to your account. Contact the school office to link your children.</EmptyState>
        </div>
      ) : (
        <div className="grid-2">
          {children.map(({ student, schoolClass }) => {
            const slug = admissionNoToSlug(student.admissionNo);
            const totals = attendance.get(student.id);
            const rate = totals && attendanceRate(totals);
            const account = feeRows.find((r) => r.student.id === student.id)?.account;
            const balance = account?.balance ?? 0;
            return (
              <div key={student.id} className="panel">
                <div className="panel--padded" style={{ display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
                  <Avatar name={studentFullName(student)} size="large" />
                  <div>
                    <h2 style={{ fontSize: 17 }}>
                      <Link href={`${base}/students/${slug}`}>{studentFullName(student)}</Link>
                    </h2>
                    <div className="muted">
                      {schoolClass?.name} · <span className="mono">{student.admissionNo}</span>
                    </div>
                  </div>
                </div>
                <dl className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <dt>Attendance this term</dt>
                    <dd className="mono" style={{ fontSize: 18 }}>
                      {rate === undefined ? '-' : formatPercent(rate)}
                    </dd>
                    <div style={{ marginTop: 6 }}>
                      <Meter value={rate ?? 0} tone={toneForRate(rate)} thin />
                    </div>
                    {totals && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {totals.absent} absent, {totals.late} late of {totals.daysOpen} days
                      </div>
                    )}
                  </div>
                  <div>
                    <dt>Fee balance</dt>
                    <dd className={balance > 0 ? 'mono bad' : 'mono good'} style={{ fontSize: 18 }}>
                      {formatBalance(balance)}
                    </dd>
                    {account && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Paid {formatMoney(account.paid)} this term
                      </div>
                    )}
                  </div>
                </dl>
                <div className="panel--padded" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="button" href={`${base}/students/${slug}/results`}>
                    <Icon name="reports" /> Report cards
                  </Link>
                  <Link className="button" href={`${base}/students/${slug}/attendance`}>
                    <Icon name="attendance" /> Attendance
                  </Link>
                  <Link className="button" href={`${base}/students/${slug}/fees`}>
                    <Icon name="fees" /> Fee statement
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
