import Link from 'next/link';
import { classTermTotals } from '@/features/attendance/classRates';
import { attendanceRate } from '@/features/attendance/summary';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { ClassTeacherField, RoomField } from '@/features/classes/ClassFields';
import { addClass } from '@/features/classes/actions';
import { yearOptions } from '@/features/classes/naming';
import { todayIso } from '@/features/school/calendar';
import { getClasses, getStaff } from '@/features/school/queries';
import { programmes } from '@/features/school/subjects';
import { staffName } from '@/features/staff/names';
import { activeRollByGender } from '@/features/students/queries';
import { ActionForm } from '@/ui/ActionForm';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { formatPercent } from '@/ui/format';

export default async function ClassesPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(viewer.role === 'headteacher');
  const { academicYear } = viewer.currentTerm;
  const [classes, staff, rolls] = await Promise.all([
    getClasses(viewer.school.id, academicYear),
    getStaff(viewer.school.id),
    activeRollByGender(viewer.school.id, academicYear, todayIso()),
  ]);
  const attendance = await classTermTotals(viewer.school.id, classes.map((c) => c.id), viewer.currentTerm);
  const unassigned = classes.filter((c) => !c.classTeacherId).length;

  return (
    <>
      <PageHeader title="Classes" meta={`${academicYear} · ${classes.length} classes${unassigned ? ` · ${unassigned} without a class teacher` : ''}`} />
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
              const roll = rolls.get(schoolClass.id) ?? { M: 0, F: 0 };
              const totals = attendance.get(schoolClass.id);
              const rate = totals && attendanceRate(totals);
              return (
                <tr key={schoolClass.id}>
                  <td>
                    <Link href={`/${school}/classes/${schoolClass.id}`}>{schoolClass.name}</Link>
                  </td>
                  <td>{schoolClass.programme ?? (schoolClass.level === 'JHS' ? 'Common Core' : '')}</td>
                  <td>{schoolClass.classTeacherId ? staffName(staff.find((s) => s.id === schoolClass.classTeacherId)) : <span className="tag tag--warn">Not assigned</span>}</td>
                  <td className="muted">{schoolClass.room}</td>
                  <td className="num">{roll.M}</td>
                  <td className="num">{roll.F}</td>
                  <td className="num">{roll.M + roll.F}</td>
                  <td className="num">{rate === undefined ? '' : formatPercent(rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Section title={`Add a class for ${academicYear}`} icon="add">
        <ActionForm action={addClass.bind(null, school)} submitLabel="Add class" icon="add">
          <div className="form-grid">
            <label className="field">
              <span>Year</span>
              <select name="yearGroup" required defaultValue="">
                <option value="">Choose</option>
                {yearOptions.map((y) => (
                  <option key={y.yearGroup} value={y.yearGroup}>
                    {y.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Programme</span>
              <select name="programme" defaultValue="">
                <option value="">None (Basic 7 to 9)</option>
                {programmes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Stream</span>
              <input name="stream" maxLength={1} placeholder="C" style={{ width: 80 }} />
              <span className="field__hint">Optional letter, for a second or third class in the same year</span>
            </label>
            <ClassTeacherField staff={staff} />
            <RoomField />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}
