import Link from 'next/link';
import { classTermTotals } from '@/features/attendance/classRates';
import { attendanceRate } from '@/features/attendance/summary';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { getClasses, getStaff } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { listStudents } from '@/features/students/queries';
import { formatPercent } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';

export default async function ClassesPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(viewer.role === 'headteacher');
  const { academicYear } = viewer.currentTerm;
  const [classes, staff, students] = await Promise.all([getClasses(viewer.school.id, academicYear), getStaff(viewer.school.id), listStudents(viewer.school.id, academicYear)]);
  const attendance = await classTermTotals(viewer.school.id, classes.map((c) => c.id), viewer.currentTerm);

  return (
    <>
      <PageHeader title="Classes" meta={academicYear} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Programme</th>
              <th>Class teacher</th>
              <th>Room</th>
              <th className="num">Boys</th>
              <th className="num">Girls</th>
              <th className="num">On roll</th>
              <th className="num">Attendance this term</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((schoolClass) => {
              const roll = students.filter((s) => s.schoolClass?.id === schoolClass.id && s.student.status === 'Active');
              const totals = attendance.get(schoolClass.id);
              const rate = totals && attendanceRate(totals);
              return (
                <tr key={schoolClass.id}>
                  <td>
                    <Link href={`/${school}/classes/${schoolClass.id}`}>{schoolClass.name}</Link>
                  </td>
                  <td>{schoolClass.programme ?? (schoolClass.level === 'JHS' ? 'Common Core' : '')}</td>
                  <td>{staffName(staff.find((s) => s.id === schoolClass.classTeacherId))}</td>
                  <td className="muted">{schoolClass.room}</td>
                  <td className="num">{roll.filter((s) => s.student.gender === 'M').length}</td>
                  <td className="num">{roll.filter((s) => s.student.gender === 'F').length}</td>
                  <td className="num">{roll.length}</td>
                  <td className="num">{rate === undefined ? '' : formatPercent(rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
