import { notFound } from 'next/navigation';
import { allow, canViewAcademics } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { loadClassReports, resolveTerm } from '@/features/reports/data';
import { ReportCard } from '@/features/reports/ReportCard';
import { loadStudent } from '@/features/students/loadStudent';
import { studentEnrolments } from '@/features/students/queries';
import { PrintButton } from '@/ui/PrintButton';

export default async function StudentReportCardPage({ params }: { params: Promise<{ school: string; student: string; term: string }> }) {
  const { school, student: slug, term: termId } = await params;
  const viewer = await requireViewer(school);
  allow(canViewAcademics(viewer));
  const { student } = await loadStudent(viewer, slug);
  const term = resolveTerm(viewer, termId);
  const enrolment = (await studentEnrolments(viewer.school.id, student.id)).find((e) => e.enrolment.academicYear === term.academicYear);
  if (!enrolment) notFound();
  const reports = await loadClassReports(viewer, enrolment.schoolClass.id, term);
  const result = reports.results.find((r) => r.student.id === student.id);
  if (!result) notFound();

  return (
    <>
      <div className="table-toolbar no-print">
        <PrintButton label="Print report" />
      </div>
      <ReportCard school={viewer.school} reports={reports} result={result} />
    </>
  );
}
