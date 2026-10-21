import Link from 'next/link';
import { allow, canAdmitStudents } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { recentMovements } from '@/features/students/movements';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import type { MovementKind } from '@/features/students/types';
import { formatDate } from '@/ui/format';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';

const kinds: MovementKind[] = ['Admission', 'Transfer in', 'Transfer out', 'Withdrawal', 'Repeat'];

export default async function MovementsPage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ kind?: string; year?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canAdmitStudents(viewer));
  const { kind, year } = await searchParams;
  const academicYear = year ?? viewer.currentTerm.academicYear;
  const yearTerms = viewer.terms.filter((t) => t.academicYear === academicYear);
  const start = yearTerms[0]?.startsOn.slice(0, 4) + '-08-01';
  const end = `${Number(start.slice(0, 4)) + 1}-07-31`;
  const rows = (await recentMovements(viewer.school.id, undefined, kind)).filter(({ movement }) => movement.date >= start && movement.date <= end);
  const years = [...new Set(viewer.terms.filter((t) => t.startsOn <= viewer.currentTerm.startsOn).map((t) => t.academicYear))].reverse();

  return (
    <>
      <PageHeader
        title="Admissions and exits"
        meta={`${academicYear} · Students who leave stay on record with their results and fee history.`}
        actions={
          <Link className="button button--primary" href={`/${school}/students/new`}>
            Admit student
          </Link>
        }
      />
      <FilterBar count={`${rows.length} records`}>
        <label className="field">
          <span>Academic year</span>
          <select name="year" defaultValue={academicYear}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select name="kind" defaultValue={kind ?? ''}>
            <option value="">All types</option>
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="table-wrap">
        {rows.length === 0 ? (
          <p className="empty">No admissions or exits recorded for these filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Admission no.</th>
                <th>Student</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ movement, student }) => (
                <tr key={movement.id}>
                  <td className="nowrap">{formatDate(movement.date)}</td>
                  <td className="nowrap">{movement.kind}</td>
                  <td className="mono">{student.admissionNo}</td>
                  <td className="nowrap">
                    <Link href={`/${school}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                  </td>
                  <td className="muted">{movement.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
