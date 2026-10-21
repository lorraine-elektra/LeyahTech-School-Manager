import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, subjects, teachingAssignments } from '@/db/schema';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { getClasses, getStaff } from '@/features/school/queries';
import { formatDate } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';

export default async function StaffPage({ params }: { params: Promise<{ school: string }> }) {
  const viewer = await requireViewer((await params).school);
  allow(viewer.role === 'headteacher');
  const { academicYear } = viewer.currentTerm;
  const [staff, yearClasses, assignmentRows] = await Promise.all([
    getStaff(viewer.school.id),
    getClasses(viewer.school.id, academicYear),
    db
      .select({ teacherId: teachingAssignments.teacherId, subject: subjects.name, className: classes.name })
      .from(teachingAssignments)
      .innerJoin(classes, eq(classes.id, teachingAssignments.classId))
      .innerJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
      .where(and(eq(teachingAssignments.schoolId, viewer.school.id), eq(classes.academicYear, academicYear))),
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
              <th>Staff no.</th>
              <th>Name</th>
              <th>Position</th>
              <th>Class teacher of</th>
              <th>Teaches</th>
              <th>Phone</th>
              <th>Qualification</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member) => {
              const teaching = assignmentRows.filter((a) => a.teacherId === member.id);
              const subjectNames = [...new Set(teaching.map((a) => a.subject))];
              return (
                <tr key={member.id}>
                  <td className="mono">{member.staffNo}</td>
                  <td className="nowrap">
                    {member.title} {member.firstName} {member.surname}
                  </td>
                  <td>{member.position}</td>
                  <td className="nowrap">{yearClasses.find((c) => c.classTeacherId === member.id)?.name}</td>
                  <td>
                    {subjectNames.map((name) => (
                      <div key={name}>
                        {name} <span className="muted">({teaching.filter((a) => a.subject === name).map((a) => a.className).join(', ')})</span>
                      </div>
                    ))}
                  </td>
                  <td className="mono nowrap">{member.phone}</td>
                  <td className="muted">{member.qualification}</td>
                  <td className="nowrap">{formatDate(member.joinedOn ?? undefined)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
