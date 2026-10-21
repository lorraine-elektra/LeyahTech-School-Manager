import Link from 'next/link';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { canViewClassReports } from '@/features/reports/access';
import { saveRemarks } from '@/features/reports/actions';
import { loadClassReports, resolveTerm } from '@/features/reports/data';
import { termLabel } from '@/features/school/calendar';
import { studentRegisterName } from '@/features/students/names';
import { PageHeader } from '@/ui/PageHeader';

export default async function RemarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string; classId: string }>;
  searchParams: Promise<{ term?: string; saved?: string }>;
}) {
  const { school, classId } = await params;
  const { term: termId, saved } = await searchParams;
  const viewer = await requireViewer(school);
  const term = resolveTerm(viewer, termId);
  const reports = await loadClassReports(viewer, classId, term);
  allow(canViewClassReports(viewer, reports.schoolClass));
  const isClassTeacher = !!viewer.staff && reports.schoolClass.classTeacherId === viewer.staff.id;
  const isHeadteacher = viewer.role === 'headteacher';
  const students = [...reports.results].sort((a, b) => a.student.surname.localeCompare(b.student.surname));

  return (
    <form action={saveRemarks.bind(null, school, classId, term.id)}>
      <PageHeader
        title={`${reports.schoolClass.name} remarks`}
        meta={`${termLabel(term)} · ${isClassTeacher ? 'You write conduct, interest and the class teacher remark.' : 'You write the headteacher remark.'}`}
        breadcrumb={<Link href={`/${school}/reports/${classId}?term=${term.id}`}>{reports.schoolClass.name} results</Link>}
        actions={
          <button type="submit" className="button button--primary">
            Save remarks
          </button>
        }
      />
      {saved && <div className="notice notice--success" style={{ marginBottom: 12 }}>Remarks saved.</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th className="num">Average</th>
              <th>Conduct</th>
              <th>Interest</th>
              <th>Class teacher remark</th>
              <th>Headteacher remark</th>
            </tr>
          </thead>
          <tbody>
            {students.map(({ student, average }) => {
              const remarks = reports.remarks.get(student.id);
              return (
                <tr key={student.id}>
                  <td className="nowrap">{studentRegisterName(student)}</td>
                  <td className="num">{average ?? ''}</td>
                  <td>
                    <input name={`conduct:${student.id}`} defaultValue={remarks?.conduct ?? ''} disabled={!isClassTeacher} style={{ width: 150 }} />
                  </td>
                  <td>
                    <input name={`interest:${student.id}`} defaultValue={remarks?.interest ?? ''} disabled={!isClassTeacher} style={{ width: 110 }} />
                  </td>
                  <td>
                    <input name={`classTeacher:${student.id}`} defaultValue={remarks?.classTeacherRemark ?? ''} disabled={!isClassTeacher} style={{ width: 280 }} />
                  </td>
                  <td>
                    <input name={`headteacher:${student.id}`} defaultValue={remarks?.headteacherRemark ?? ''} disabled={!isHeadteacher} style={{ width: 220 }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
