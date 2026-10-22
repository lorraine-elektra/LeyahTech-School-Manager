import { allow, canAdmitStudents } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { guardianRelationships, personTitles } from '@/features/school/people';
import { updateStudentDetails } from '@/features/students/actions';
import { loadStudent } from '@/features/students/loadStudent';
import { ActionForm } from '@/ui/ActionForm';
import { Section } from '@/ui/Section';

export default async function EditStudentPage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  allow(canAdmitStudents(viewer));
  const { student, guardian } = await loadStudent(viewer, slug);

  return (
    <ActionForm action={updateStudentDetails.bind(null, school, student.id)} submitLabel="Save details" className="">
      <Section title="Student" icon="person">
        <div className="panel panel--padded form-grid">
          <label className="field">
            <span>Surname</span>
            <input name="surname" defaultValue={student.surname} required />
          </label>
          <label className="field">
            <span>First name</span>
            <input name="firstName" defaultValue={student.firstName} required />
          </label>
          <label className="field">
            <span>Other names</span>
            <input name="otherNames" defaultValue={student.otherNames ?? ''} />
          </label>
          <label className="field">
            <span>Sex</span>
            <select name="gender" defaultValue={student.gender}>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input name="dateOfBirth" type="date" defaultValue={student.dateOfBirth} max={todayIso()} required />
          </label>
          <label className="field">
            <span>Medical notes</span>
            <input name="medicalNotes" defaultValue={student.medicalNotes ?? ''} placeholder="Allergies, conditions, medication kept at school" />
          </label>
        </div>
      </Section>
      {guardian && (
        <Section title="Parent or guardian" icon="students" aside="Shared with any siblings at the school">
          <div className="panel panel--padded form-grid">
            <label className="field">
              <span>Title</span>
              <select name="guardianTitle" defaultValue={guardian.title}>
                {personTitles.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Full name</span>
              <input name="guardianName" defaultValue={guardian.name} required />
            </label>
            <label className="field">
              <span>Relationship</span>
              <select name="relationship" defaultValue={guardian.relationship}>
                {[...new Set([guardian.relationship, ...guardianRelationships])].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="guardianPhone" defaultValue={guardian.phone ?? ''} placeholder="024 412 6630" inputMode="tel" className="mono" />
            </label>
            <label className="field">
              <span>Other phone</span>
              <input name="guardianAltPhone" defaultValue={guardian.altPhone ?? ''} inputMode="tel" className="mono" />
            </label>
            <label className="field">
              <span>Occupation</span>
              <input name="occupation" defaultValue={guardian.occupation ?? ''} />
            </label>
            <label className="field">
              <span>Residence</span>
              <input name="residence" defaultValue={guardian.residence ?? ''} placeholder="Area or town" />
            </label>
          </div>
        </Section>
      )}
    </ActionForm>
  );
}
