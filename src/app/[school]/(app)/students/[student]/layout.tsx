import type { ReactNode } from 'react';
import { canViewAcademics, canViewFees } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { loadStudent } from '@/features/students/loadStudent';
import { studentFullName } from '@/features/students/names';
import { studentEnrolments } from '@/features/students/queries';
import { StudentStatusTag } from '@/features/students/StudentStatusTag';
import { PageHeader } from '@/ui/PageHeader';
import { Tabs } from '@/ui/Tabs';

export default async function StudentLayout({ children, params }: { children: ReactNode; params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  const { student } = await loadStudent(viewer, slug);
  const enrolments = await studentEnrolments(viewer.school.id, student.id);
  const latest = enrolments.at(-1);
  const base = `/${school}/students/${slug}`;
  const tabs = [{ href: base, label: 'Profile' }];
  if (canViewAcademics(viewer)) tabs.push({ href: `${base}/attendance`, label: 'Attendance' }, { href: `${base}/results`, label: 'Results' });
  if (canViewFees(viewer)) tabs.push({ href: `${base}/fees`, label: 'Fees' });

  return (
    <>
      <div className="no-print">
      <PageHeader
        title={studentFullName(student)}
        meta={
          <>
            <span className="mono">{student.admissionNo}</span> · {latest?.schoolClass.name} {latest && `(${latest.enrolment.academicYear})`} ·{' '}
            <StudentStatusTag status={student.status} />
          </>
        }
      />
      <Tabs tabs={tabs} />
      </div>
      {children}
    </>
  );
}
