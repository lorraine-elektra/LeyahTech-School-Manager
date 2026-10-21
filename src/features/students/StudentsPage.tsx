import Link from 'next/link';
import { canAdmitStudents, canViewFees } from '@/features/auth/permissions';
import type { Viewer } from '@/features/auth/session';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { getClasses } from '@/features/school/queries';
import { todayIso } from '@/features/school/calendar';
import { ageOn, formatBalance } from '@/ui/format';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { visibleStudentIds } from './access';
import { admissionNoToSlug, studentFullName, studentRegisterName } from './names';
import { listStudents } from './queries';
import { StudentStatusTag } from './StudentStatusTag';
import type { StudentStatus } from './types';

interface StudentFilters {
  q?: string;
  class?: string;
  status?: string;
}

const statuses: StudentStatus[] = ['Active', 'Withdrawn', 'Transferred out', 'Completed'];

export async function StudentsPage({ viewer, filters }: { viewer: Viewer; filters: StudentFilters }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const scope = await visibleStudentIds(viewer);
  const showFees = canViewFees(viewer);
  const [rows, classes, feeRows] = await Promise.all([
    listStudents(viewer.school.id, viewer.currentTerm.academicYear, scope === 'all' ? undefined : scope),
    getClasses(viewer.school.id, viewer.currentTerm.academicYear),
    showFees ? schoolFeeAccounts(viewer) : Promise.resolve([]),
  ]);
  const balanceByStudent = new Map(feeRows.map((r) => [r.student.id, r.account.balance]));
  const status = filters.status ?? 'Active';
  const query = filters.q?.trim().toLowerCase();

  const filtered = rows.filter(
    ({ student, schoolClass, guardian }) =>
      (status === 'all' || student.status === status) &&
      (!filters.class || schoolClass?.id === filters.class) &&
      (!query ||
        studentFullName(student).toLowerCase().includes(query) ||
        student.admissionNo.toLowerCase().includes(query) ||
        guardian?.name.toLowerCase().includes(query) ||
        guardian?.phone?.replace(/\s/g, '').includes(query.replace(/\s/g, ''))),
  );

  return (
    <>
      <PageHeader
        title={viewer.role === 'subjectTeacher' ? 'My students' : 'Students'}
        actions={
          canAdmitStudents(viewer) && (
            <Link className="button button--primary" href={`${base}/students/new`}>
              Admit student
            </Link>
          )
        }
      />
      <FilterBar count={`${filtered.length} students`}>
        <label className="field">
          <span>Search</span>
          <input name="q" defaultValue={filters.q} placeholder="Name, admission no., guardian or phone" style={{ width: 280 }} />
        </label>
        <label className="field">
          <span>Class</span>
          <select name="class" defaultValue={filters.class ?? ''}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={status}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="all">All statuses</option>
          </select>
        </label>
      </FilterBar>

      <div className="table-wrap">
        {filtered.length === 0 ? (
          <p className="empty">No students match these filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Admission no.</th>
                <th>Name</th>
                <th>Class</th>
                <th>Sex</th>
                <th className="num">Age</th>
                <th>Guardian</th>
                <th>Guardian phone</th>
                <th>Status</th>
                {showFees && <th className="num">Balance</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ student, schoolClass, guardian }) => {
                const balance = balanceByStudent.get(student.id) ?? 0;
                return (
                  <tr key={student.id}>
                    <td className="mono">{student.admissionNo}</td>
                    <td>
                      <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                    </td>
                    <td className="nowrap">{schoolClass?.name}</td>
                    <td>{student.gender}</td>
                    <td className="num">{ageOn(student.dateOfBirth, today)}</td>
                    <td>{guardian ? `${guardian.title} ${guardian.name}` : ''}</td>
                    <td className="mono nowrap">{guardian?.phone ?? <span className="warn" style={{ fontFamily: 'var(--font-sans)' }}>No phone</span>}</td>
                    <td>
                      <StudentStatusTag status={student.status} />
                    </td>
                    {showFees && <td className={balance > 0 ? 'num bad' : 'num'}>{formatBalance(balance)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
