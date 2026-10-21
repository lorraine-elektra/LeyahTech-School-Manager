import Link from 'next/link';
import { allow, canViewAcademics } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { loadClassReports } from '@/features/reports/data';
import { termLabel, termsUpTo } from '@/features/school/calendar';
import { loadStudent } from '@/features/students/loadStudent';
import { studentEnrolments } from '@/features/students/queries';
import { ordinal } from '@/ui/format';
import { Section } from '@/ui/Section';

export default async function StudentResultsPage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  allow(canViewAcademics(viewer));
  const { student } = await loadStudent(viewer, slug);
  const enrolments = await studentEnrolments(viewer.school.id, student.id);

  const rows = (
    await Promise.all(
      termsUpTo(viewer.terms, viewer.currentTerm.id)
        .reverse()
        .map(async (term) => {
          const enrolment = enrolments.find((e) => e.enrolment.academicYear === term.academicYear);
          if (!enrolment) return undefined;
          const reports = await loadClassReports(viewer, enrolment.schoolClass.id, term);
          const result = reports.results.find((r) => r.student.id === student.id);
          return result && { term, reports, result };
        }),
    )
  ).filter((row) => row !== undefined);

  return (
    <Section title="Term results">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <p className="empty">No results recorded for this student.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Class</th>
                <th className="num">Subjects scored</th>
                <th className="num">Average</th>
                <th className="num">Position</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ term, reports, result }) => (
                <tr key={term.id}>
                  <td>{termLabel(term)}</td>
                  <td>{reports.schoolClass.name}</td>
                  <td className="num">
                    {result.subjects.filter((s) => s.total !== null).length} of {result.subjects.length}
                  </td>
                  <td className="num">{result.average ?? <span className="faint">Incomplete</span>}</td>
                  <td className="num">{result.position ? `${ordinal(result.position)} of ${reports.results.filter((r) => r.position).length}` : ''}</td>
                  <td>
                    <Link href={`/${school}/students/${slug}/results/${term.id}`}>Report card</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  );
}
