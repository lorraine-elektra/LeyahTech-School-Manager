import Link from 'next/link';
import { redirect } from 'next/navigation';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { loadClassReports, resolveTerm } from '@/features/reports/data';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { TermSelect } from '@/ui/TermSelect';

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ term?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  if (viewer.role === 'classTeacher' && viewer.ownClassId) redirect(`/${school}/reports/${viewer.ownClassId}`);
  allow(viewer.role === 'headteacher');
  const term = resolveTerm(viewer, (await searchParams).term);
  const classes = await getClasses(viewer.school.id, term.academicYear);
  const summaries = await Promise.all(classes.map((c) => loadClassReports(viewer, c.id, term)));

  return (
    <>
      <PageHeader title="Report cards" meta={termLabel(term)} />
      <FilterBar>
        <TermSelect terms={termsUpTo(viewer.terms, viewer.currentTerm.id)} value={term.id} />
      </FilterBar>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Class teacher</th>
              <th className="num">On roll</th>
              <th className="num">Results complete</th>
              <th className="num">Class teacher remarks</th>
              <th className="num">Headteacher remarks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((reports) => {
              const total = reports.results.length;
              const complete = reports.results.filter((r) => r.isComplete).length;
              const remarks = [...reports.remarks.values()];
              const teacherDone = remarks.filter((r) => r.classTeacherRemark).length;
              const headDone = remarks.filter((r) => r.headteacherRemark).length;
              return (
                <tr key={reports.schoolClass.id}>
                  <td>
                    <Link href={`/${school}/reports/${reports.schoolClass.id}?term=${term.id}`}>{reports.schoolClass.name}</Link>
                  </td>
                  <td>{reports.classTeacher ? `${reports.classTeacher.title} ${reports.classTeacher.surname}` : ''}</td>
                  <td className="num">{total}</td>
                  <td className={complete < total ? 'num warn' : 'num'}>{complete}</td>
                  <td className={teacherDone < total ? 'num warn' : 'num'}>{teacherDone}</td>
                  <td className={headDone < total ? 'num warn' : 'num'}>{headDone}</td>
                  <td className="nowrap">
                    <Link href={`/${school}/reports/${reports.schoolClass.id}/remarks?term=${term.id}`}>Remarks</Link> ·{' '}
                    <Link href={`/${school}/reports/${reports.schoolClass.id}/print?term=${term.id}`}>Print all</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
