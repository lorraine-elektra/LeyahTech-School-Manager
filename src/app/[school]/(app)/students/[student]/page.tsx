import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { studentMovements } from '@/db/schema';
import { canRecordExits } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { loadStudent } from '@/features/students/loadStudent';
import { studentEnrolments } from '@/features/students/queries';
import { ageOn, formatDate } from '@/ui/format';
import { Section } from '@/ui/Section';

export default async function StudentProfilePage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  const { student, guardian } = await loadStudent(viewer, slug);
  const [enrolments, movements] = await Promise.all([
    studentEnrolments(viewer.school.id, student.id),
    db.select().from(studentMovements).where(and(eq(studentMovements.schoolId, viewer.school.id), eq(studentMovements.studentId, student.id))).orderBy(desc(studentMovements.date)),
  ]);

  return (
    <>
      <div className="two-col">
        <Section title="Student">
          <dl className="panel detail-grid">
            <div>
              <dt>Date of birth</dt>
              <dd>
                {formatDate(student.dateOfBirth)} <span className="muted">(age {ageOn(student.dateOfBirth, todayIso())})</span>
              </dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{student.gender === 'M' ? 'Male' : 'Female'}</dd>
            </div>
            <div>
              <dt>Admitted</dt>
              <dd>
                {formatDate(student.admittedOn)} <span className="muted">· {student.admissionType}</span>
              </dd>
            </div>
            <div>
              <dt>Previous school</dt>
              <dd>{student.previousSchool ?? <span className="faint">Not recorded</span>}</dd>
            </div>
            <div>
              <dt>Medical notes</dt>
              <dd>{student.medicalNotes ?? <span className="faint">None recorded</span>}</dd>
            </div>
            {student.exitedOn && (
              <div>
                <dt>Left school</dt>
                <dd>
                  {formatDate(student.exitedOn)}. {student.exitReason}
                </dd>
              </div>
            )}
          </dl>
        </Section>
        <Section title="Parent or guardian">
          {guardian ? (
            <dl className="panel detail-grid">
              <div>
                <dt>Name</dt>
                <dd>
                  {guardian.title} {guardian.name} <span className="muted">· {guardian.relationship}</span>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd className="mono">{guardian.phone ?? <span className="warn">No phone number. Ask the parent for one at next contact.</span>}</dd>
              </div>
              <div>
                <dt>Other phone</dt>
                <dd className="mono">{guardian.altPhone ?? <span className="faint">None</span>}</dd>
              </div>
              <div>
                <dt>Occupation</dt>
                <dd>{guardian.occupation}</dd>
              </div>
              <div>
                <dt>Residence</dt>
                <dd>{guardian.residence}</dd>
              </div>
            </dl>
          ) : (
            <p className="panel empty">No guardian recorded.</p>
          )}
        </Section>
      </div>

      <Section title="Classes by year">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Academic year</th>
                <th>Class</th>
                <th>End of year outcome</th>
              </tr>
            </thead>
            <tbody>
              {enrolments.map(({ enrolment, schoolClass }) => (
                <tr key={enrolment.academicYear}>
                  <td>{enrolment.academicYear}</td>
                  <td>{schoolClass.name}</td>
                  <td>{enrolment.outcome ?? <span className="faint">In progress</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Admission and exit records"
        aside={
          canRecordExits(viewer) &&
          student.status === 'Active' && <Link href={`/${school}/students/${slug}/exit`}>Record withdrawal or transfer</Link>
        }
      >
        <div className="table-wrap">
          {movements.length === 0 ? (
            <p className="empty">No admission or exit records. This student was admitted before records moved into the system.</p>
          ) : (
            <table className="table">
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="nowrap">{formatDate(movement.date)}</td>
                    <td className="nowrap">{movement.kind}</td>
                    <td className="muted">{movement.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
