import { allow, canRecordExits } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { recordExit } from '@/features/students/actions';
import { ExitForm } from '@/features/students/ExitForm';
import { loadStudent } from '@/features/students/loadStudent';
import { Section } from '@/ui/Section';

export default async function RecordExitPage({ params }: { params: Promise<{ school: string; student: string }> }) {
  const { school, student: slug } = await params;
  const viewer = await requireViewer(school);
  allow(canRecordExits(viewer));
  const { student } = await loadStudent(viewer, slug);
  return (
    <Section title="Record withdrawal or transfer">
      {student.status === 'Active' ? (
        <ExitForm action={recordExit.bind(null, school, student.id)} today={todayIso()} />
      ) : (
        <p className="panel empty">This student is {student.status.toLowerCase()}. Their exit is already recorded.</p>
      )}
    </Section>
  );
}
