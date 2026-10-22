import Link from 'next/link';
import { canAdmitStudents, canViewFees } from '@/features/auth/permissions';
import type { Viewer } from '@/features/auth/session';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { todayIso } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { FilterBar } from '@/ui/FilterBar';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { PAGE_SIZE, pageFrom, Pagination } from '@/ui/Pagination';
import { ageOn, formatBalance } from '@/ui/format';
import { StudentStatusTag } from './StudentStatusTag';
import { visibleStudentIds } from './access';
import { admissionNoToSlug, studentFullName, studentRegisterName } from './names';
import { searchStudents } from './queries';
import type { StudentStatus } from './types';

interface StudentFilters {
  q?: string;
  class?: string;
  status?: string;
  page?: string;
}

const statuses: StudentStatus[] = ['Active', 'Withdrawn', 'Transferred out', 'Completed'];

export async function StudentsPage({ viewer, filters }: { viewer: Viewer; filters: StudentFilters }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const scope = await visibleStudentIds(viewer);
  const showFees = canViewFees(viewer);
  const status = (statuses as string[]).includes(filters.status ?? '') || filters.status === 'all' ? (filters.status as StudentStatus | 'all') : 'Active';
  const page = pageFrom(filters.page);

  const [{ rows, total }, classes] = await Promise.all([
    searchStudents(viewer.school.id, viewer.currentTerm.academicYear, {
      q: filters.q,
      classId: filters.class || undefined,
      status,
      ids: scope === 'all' ? undefined : scope,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getClasses(viewer.school.id, viewer.currentTerm.academicYear),
  ]);
  const feeRows = showFees && rows.length ? await schoolFeeAccounts(viewer, viewer.currentTerm.id, rows.map((r) => r.student.id)) : [];
  const balanceByStudent = new Map(feeRows.map((r) => [r.student.id, r.account.balance]));
  const exportQuery = new URLSearchParams(Object.entries({ q: filters.q, class: filters.class, status }).filter((e): e is [string, string] => !!e[1]));

  return (
    <>
      <PageHeader
        title={viewer.role === 'subjectTeacher' ? 'My students' : 'Students'}
        meta={`${total} ${status === 'all' ? '' : status.toLowerCase() + ' '}students${filters.q ? ` matching "${filters.q}"` : ''}`}
        actions={
          <>
            {viewer.role !== 'subjectTeacher' && (
              <a className="button" href={`${base}/exports/students?${exportQuery}`}>
                <Icon name="download" /> Export CSV
              </a>
            )}
            {canAdmitStudents(viewer) && (
              <Link className="button button--primary" href={`${base}/students/new`}>
                <Icon name="admit" /> Admit student
              </Link>
            )}
          </>
        }
      />
      <FilterBar>
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
        {rows.length === 0 ? (
          <EmptyState icon="search">No students match these filters. Clear the search or choose another class.</EmptyState>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission no.</th>
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
                {rows.map(({ student, schoolClass, guardian }) => {
                  const balance = balanceByStudent.get(student.id) ?? 0;
                  return (
                    <tr key={student.id}>
                      <td>
                        <span className="person">
                          <Avatar name={studentFullName(student)} size="small" />
                          <Link href={`${base}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                        </span>
                      </td>
                      <td className="mono">{student.admissionNo}</td>
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
            <Pagination page={page} total={total} basePath={`${base}/students`} params={{ q: filters.q, class: filters.class, status }} />
          </>
        )}
      </div>
    </>
  );
}
