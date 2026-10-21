import { termLabel } from '@/features/school/calendar';
import { gradeBandsFor } from '@/features/school/grading';
import type { School } from '@/features/school/types';
import { staffName } from '@/features/staff/names';
import { studentFullName } from '@/features/students/names';
import { formatDate, ordinal } from '@/ui/format';
import type { StudentTermResult } from '@/features/assessment/results';
import type { ClassReports } from './data';

export function ReportCard({ school, reports, result }: { school: School; reports: ClassReports; result: StudentTermResult }) {
  const { student } = result;
  const remarks = reports.remarks.get(student.id);
  const attendance = reports.attendance.get(student.id);
  const missing = result.subjects.filter((s) => s.total === null).length;

  return (
    <article className="report-card">
      <header className="report-card__header">
        <div className="school-mark__crest" aria-hidden="true">
          {school.shortName}
        </div>
        <div>
          <div className="report-card__school">{school.name}</div>
          <div className="muted">{school.address}</div>
          <div className="muted">
            {school.phone} · {school.email}
          </div>
        </div>
        <div className="report-card__title">
          Terminal report
          <div className="muted">{termLabel(reports.term)}</div>
        </div>
      </header>

      <dl className="report-card__facts">
        <div>
          <dt>Name</dt>
          <dd>{studentFullName(student)}</dd>
        </div>
        <div>
          <dt>Admission no.</dt>
          <dd className="mono">{student.admissionNo}</dd>
        </div>
        <div>
          <dt>Class</dt>
          <dd>{reports.schoolClass.name}</dd>
        </div>
        <div>
          <dt>Number on roll</dt>
          <dd>{reports.results.length}</dd>
        </div>
        <div>
          <dt>Position in class</dt>
          <dd>{result.position ? `${ordinal(result.position)} of ${reports.results.filter((r) => r.position).length}` : 'Not ranked'}</dd>
        </div>
        <div>
          <dt>Average score</dt>
          <dd>{result.average ?? 'Incomplete'}</dd>
        </div>
        <div>
          <dt>Attendance</dt>
          <dd>{attendance ? `${attendance.present + attendance.late} out of ${attendance.daysOpen}` : 'Not recorded'}</dd>
        </div>
        <div>
          <dt>Vacation date</dt>
          <dd>{formatDate(reports.term.endsOn)}</dd>
        </div>
        <div>
          <dt>Next term begins</dt>
          <dd>{reports.nextTermBegins ? formatDate(reports.nextTermBegins) : 'To be announced'}</dd>
        </div>
      </dl>

      {missing > 0 && <p className="notice notice--info no-print">{missing} subject scores are not entered yet. Totals, grades and positions appear once both scores are in.</p>}

      <table className="table report-card__table">
        <thead>
          <tr>
            <th>Subject</th>
            <th className="num">Class score (30)</th>
            <th className="num">Exam (100)</th>
            <th className="num">Exam 70%</th>
            <th className="num">Total (100)</th>
            <th className="num">Grade</th>
            <th className="num">Position</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((row) => (
            <tr key={row.subject.id}>
              <td>{row.subject.name}</td>
              <td className="num">{row.classScore ?? ''}</td>
              <td className="num">{row.examScore ?? ''}</td>
              <td className="num">{row.weightedExam ?? ''}</td>
              <td className="num">{row.total ?? ''}</td>
              <td className="num">{row.grade?.grade ?? ''}</td>
              <td className="num">{row.position ? ordinal(row.position) : ''}</td>
              <td>{row.grade?.remark ?? ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td colSpan={3}></td>
            <td className="num">{result.overallTotal}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>

      <dl className="report-card__remarks">
        <div>
          <dt>Conduct</dt>
          <dd>{remarks?.conduct ?? ''}</dd>
        </div>
        <div>
          <dt>Interest</dt>
          <dd>{remarks?.interest ?? ''}</dd>
        </div>
        <div className="wide">
          <dt>Class teacher&apos;s remark</dt>
          <dd>{remarks?.classTeacherRemark ?? ''}</dd>
          <div className="report-card__signature">{staffName(reports.classTeacher)}</div>
        </div>
        <div className="wide">
          <dt>Headteacher&apos;s remark</dt>
          <dd>{remarks?.headteacherRemark ?? ''}</dd>
          <div className="report-card__signature">{staffName(reports.headteacher)}</div>
        </div>
      </dl>

      <footer className="report-card__key">
        Grades:{' '}
        {gradeBandsFor(reports.schoolClass.level)
          .map((band, index, bands) => `${band.grade} ${band.minScore}-${index === 0 ? 100 : bands[index - 1].minScore - 1} ${band.remark}`)
          .join(' · ')}
        . Class score is 30% and examination 70% of the total.
      </footer>
    </article>
  );
}
