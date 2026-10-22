import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { enrolments, teachingAssignments } from '@/db/schema';
import { termAttendanceTotals } from '@/features/attendance/queries';
import { attendanceRate } from '@/features/attendance/summary';
import { allow, canViewClass } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { ClassTeacherField, RoomField } from '@/features/classes/ClassFields';
import { updateClass } from '@/features/classes/actions';
import { todayIso } from '@/features/school/calendar';
import { getClass, getStaff, getSubjects } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { StudentStatusTag } from '@/features/students/StudentStatusTag';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { listStudents } from '@/features/students/queries';
import { ActionForm } from '@/ui/ActionForm';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { ageOn, formatPercent } from '@/ui/format';

export default async function ClassPage({ params }: { params: Promise<{ school: string; classId: string }> }) {
  const { school, classId } = await params;
  const viewer = await requireViewer(school);
  allow(canViewClass(viewer, classId));
  const schoolClass = await getClass(viewer.school.id, classId);
  if (!schoolClass) notFound();
  const memberIds = (await db.select({ id: enrolments.studentId }).from(enrolments).where(eq(enrolments.classId, classId))).map((r) => r.id);
  const [rows, staff, subjects, assignments] = await Promise.all([
    listStudents(viewer.school.id, schoolClass.academicYear, memberIds),
    getStaff(viewer.school.id),
    getSubjects(viewer.school.id),
    db.select().from(teachingAssignments).where(eq(teachingAssignments.classId, classId)),
  ]);
  const attendance = await termAttendanceTotals(viewer.school.id, viewer.currentTerm, memberIds);
  const today = todayIso();
  const active = rows.filter((r) => r.student.status === 'Active');

  return (
    <>
      <PageHeader
        title={schoolClass.name}
        meta={`${schoolClass.academicYear} · Class teacher ${staffName(staff.find((s) => s.id === schoolClass.classTeacherId))} · ${active.length} on roll`}
        actions={
          canViewClass(viewer, classId) && (
            <>
              <Link className="button" href={`/${school}/attendance/${classId}`}>
                Attendance
              </Link>
              <Link className="button" href={`/${school}/reports/${classId}`}>
                Results
              </Link>
            </>
          )
        }
      />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="num">No.</th>
              <th>Admission no.</th>
              <th>Student</th>
              <th>Sex</th>
              <th className="num">Age</th>
              <th>Guardian</th>
              <th>Phone</th>
              <th className="num">Attendance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, guardian }, index) => {
              const totals = attendance.get(student.id);
              const rate = totals && attendanceRate(totals);
              return (
                <tr key={student.id} className={student.status !== 'Active' ? 'row-muted' : undefined}>
                  <td className="num">{index + 1}</td>
                  <td className="mono">{student.admissionNo}</td>
                  <td className="nowrap">
                    <Link href={`/${school}/students/${admissionNoToSlug(student.admissionNo)}`}>{studentRegisterName(student)}</Link>
                  </td>
                  <td>{student.gender}</td>
                  <td className="num">{ageOn(student.dateOfBirth, today)}</td>
                  <td>{guardian ? `${guardian.title} ${guardian.name}` : ''}</td>
                  <td className="mono nowrap">{guardian?.phone ?? <span className="warn">No phone</span>}</td>
                  <td className={rate !== undefined && rate < 85 ? 'num bad' : 'num'}>{rate === undefined ? '' : formatPercent(rate)}</td>
                  <td>
                    <StudentStatusTag status={student.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {viewer.role === 'headteacher' && (
        <Section title="Class details" icon="edit">
          <ActionForm action={updateClass.bind(null, school, classId)} submitLabel="Save class details">
            <div className="form-grid" style={{ maxWidth: 640 }}>
              <ClassTeacherField staff={staff} value={schoolClass.classTeacherId} />
              <RoomField value={schoolClass.room} />
            </div>
          </ActionForm>
        </Section>
      )}
      <Section title="Subject teachers" icon="subject">
        <div className="table-wrap" style={{ maxWidth: 640 }}>
          <table className="table">
            <tbody>
              {subjects
                .filter((subject) => assignments.some((a) => a.subjectId === subject.id))
                .map((subject) => (
                  <tr key={subject.id}>
                    <td>{subject.name}</td>
                    <td>{staffName(staff.find((s) => s.id === assignments.find((a) => a.subjectId === subject.id)?.teacherId))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
