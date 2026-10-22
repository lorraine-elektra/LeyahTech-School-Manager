import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, subjects, teachingAssignments, users } from '@/db/schema';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { getClasses, getStaff } from '@/features/school/queries';
import { AddStaffForm } from '@/features/staff/AddStaffForm';
import { LoginControls } from '@/features/staff/LoginControls';
import { addStaffMember, resetPassword, setLoginDisabled } from '@/features/staff/actions';
import { staffName } from '@/features/staff/names';
import { Avatar } from '@/ui/Avatar';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';

export default async function StaffPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(viewer.role === 'headteacher');
  const { academicYear } = viewer.currentTerm;
  const [staff, yearClasses, assignmentRows, logins] = await Promise.all([
    getStaff(viewer.school.id),
    getClasses(viewer.school.id, academicYear),
    db
      .select({ teacherId: teachingAssignments.teacherId, subject: subjects.name, className: classes.name })
      .from(teachingAssignments)
      .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
      .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
      .where(and(eq(teachingAssignments.schoolId, viewer.school.id), eq(classes.academicYear, academicYear))),
    db.select().from(users).where(eq(users.schoolId, viewer.school.id)),
  ]);
  const order = ['Headteacher', 'Assistant Headteacher', 'Bursar', 'Accounts Clerk', 'Teacher'];
  const sorted = [...staff].sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position) || a.surname.localeCompare(b.surname));

  return (
    <>
      <PageHeader title="Staff" meta={`${staff.length} staff · ${academicYear}`} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Class</th>
              <th>Teaches</th>
              <th>Phone</th>
              <th>Login</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member) => {
              const teaching = assignmentRows.filter((a) => a.teacherId === member.id);
              const subjectNames = [...new Set(teaching.map((a) => a.subject))];
              const login = logins.find((u) => u.staffId === member.id);
              return (
                <tr key={member.id}>
                  <td>
                    <span className="person">
                      <Avatar name={staffName(member)} size="small" />
                      <span className="person__text">
                        {staffName(member)}
                        <div className="person__sub">
                          <span className="mono">{member.staffNo}</span>
                          {member.qualification && ` · ${member.qualification}`}
                        </div>
                      </span>
                    </span>
                  </td>
                  <td>
                    {member.position}
                    {member.joinedOn && <div className="person__sub">Since {member.joinedOn.slice(0, 4)}</div>}
                  </td>
                  <td className="nowrap">{yearClasses.find((c) => c.classTeacherId === member.id)?.name}</td>
                  <td>
                    {subjectNames.map((name) => {
                      const classNames = teaching.filter((a) => a.subject === name).map((a) => a.className);
                      return (
                        <div key={name} title={classNames.join(', ')}>
                          {name} <span className="muted">· {classNames.length === 1 ? classNames[0] : `${classNames.length} classes`}</span>
                        </div>
                      );
                    })}
                  </td>
                  <td className="mono nowrap">{member.phone}</td>
                  <td>
                    {login ? (
                      <LoginControls
                        username={login.username}
                        disabled={!!login.disabledAt}
                        isSelf={login.id === viewer.userId}
                        resetAction={resetPassword.bind(null, school, login.id)}
                        toggleAction={setLoginDisabled.bind(null, school, login.id, !login.disabledAt)}
                      />
                    ) : (
                      <span className="faint">No login</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Section title="Add a staff member" icon="add" aside="A login is created with a temporary password">
        <AddStaffForm action={addStaffMember.bind(null, school)} />
      </Section>
    </>
  );
}
