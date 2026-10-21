import Link from 'next/link';
import { allow, canAdmitStudents } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { admitStudent } from '@/features/students/actions';
import { AdmitStudentForm } from '@/features/students/AdmitStudentForm';
import { PageHeader } from '@/ui/PageHeader';

export default async function AdmitStudentPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canAdmitStudents(viewer));
  const classes = await getClasses(viewer.school.id, viewer.currentTerm.academicYear);
  return (
    <>
      <PageHeader
        title="Admit student"
        meta="The admission number is issued when you save."
        breadcrumb={<Link href={`/${school}/students`}>Students</Link>}
      />
      <AdmitStudentForm action={admitStudent.bind(null, school)} classes={classes} today={todayIso()} />
    </>
  );
}
