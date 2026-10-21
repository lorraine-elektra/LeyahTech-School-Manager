import Link from 'next/link';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { canViewClassReports } from '@/features/reports/access';
import { loadClassReports, resolveTerm } from '@/features/reports/data';
import { ReportCard } from '@/features/reports/ReportCard';
import { termLabel } from '@/features/school/calendar';
import { PageHeader } from '@/ui/PageHeader';
import { PrintButton } from '@/ui/PrintButton';

export default async function PrintClassReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string; classId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { school, classId } = await params;
  const viewer = await requireViewer(school);
  const term = resolveTerm(viewer, (await searchParams).term);
  const reports = await loadClassReports(viewer, classId, term);
  allow(canViewClassReports(viewer, reports.schoolClass));
  const inRegisterOrder = [...reports.results].sort((a, b) => a.student.surname.localeCompare(b.student.surname) || a.student.firstName.localeCompare(b.student.firstName));

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`${reports.schoolClass.name} report cards`}
          meta={`${termLabel(term)} · ${inRegisterOrder.length} reports, one per page when printed`}
          breadcrumb={<Link href={`/${school}/reports/${classId}?term=${term.id}`}>{reports.schoolClass.name} results</Link>}
          actions={<PrintButton label="Print all reports" />}
        />
      </div>
      {inRegisterOrder.map((result) => (
        <ReportCard key={result.student.id} school={viewer.school} reports={reports} result={result} />
      ))}
    </>
  );
}
