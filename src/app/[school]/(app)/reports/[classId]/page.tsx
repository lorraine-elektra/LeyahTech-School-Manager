import Link from 'next/link';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { canViewClassReports } from '@/features/reports/access';
import { loadClassReports, resolveTerm } from '@/features/reports/data';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { formatPercent, ordinal } from '@/ui/format';
import { attendanceRate } from '@/features/attendance/summary';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { TermSelect } from '@/ui/TermSelect';

export default async function ClassReportsPage({
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
  const ranked = [...reports.results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.student.surname.localeCompare(b.student.surname));
  const yearTerms = termsUpTo(viewer.terms, viewer.currentTerm.id).filter((t) => t.academicYear === term.academicYear);

  return (
    <>
      <PageHeader
        title={`${reports.schoolClass.name} results`}
        meta={termLabel(term)}
        breadcrumb={viewer.role === 'headteacher' && <Link href={`/${school}/reports?term=${term.id}`}>Report cards</Link>}
        actions={
          <>
            <Link className="button" href={`/${school}/reports/${classId}/remarks?term=${term.id}`}>
              Enter remarks
            </Link>
            <Link className="button button--primary" href={`/${school}/reports/${classId}/print?term=${term.id}`}>
              Print all reports
            </Link>
          </>
        }
      />
      <FilterBar>
        <TermSelect terms={yearTerms} value={term.id} />
      </FilterBar>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="num">Pos.</th>
              <th>Student</th>
              {reports.subjects.map((subject) => (
                <th key={subject.id} className="num" title={subject.name}>
                  {subject.name.split(/[\s(-]/)[0].slice(0, 7)}
                </th>
              ))}
              <th className="num">Total</th>
              <th className="num">Average</th>
              <th className="num">Attendance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((result) => {
              const attendance = reports.attendance.get(result.student.id);
              const rate = attendance && attendanceRate(attendance);
              return (
                <tr key={result.student.id}>
                  <td className="num">{result.position ? ordinal(result.position) : ''}</td>
                  <td className="nowrap">{studentRegisterName(result.student)}</td>
                  {result.subjects.map((s) => (
                    <td key={s.subject.id} className={s.total !== null && s.total < 40 ? 'num bad' : 'num'}>
                      {s.total ?? <span className="faint">-</span>}
                    </td>
                  ))}
                  <td className="num">{result.overallTotal}</td>
                  <td className="num">{result.average ?? <span className="faint">Incomplete</span>}</td>
                  <td className="num">{rate === undefined ? '' : formatPercent(rate)}</td>
                  <td>
                    <Link href={`/${school}/students/${admissionNoToSlug(result.student.admissionNo)}/results/${term.id}`}>Report</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Subject totals out of 100. Scores below 40 are marked. Students without every score are not ranked.
      </p>
    </>
  );
}
