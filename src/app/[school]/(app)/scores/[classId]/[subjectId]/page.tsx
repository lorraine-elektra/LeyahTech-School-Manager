import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveScores } from '@/features/assessment/actions';
import { termScores } from '@/features/assessment/queries';
import { ScoreSheetForm } from '@/features/assessment/ScoreSheetForm';
import { allow, canEnterScores } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel } from '@/features/school/calendar';
import { getClass, getStaff, getSubjects } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { studentRegisterName } from '@/features/students/names';
import { classRoll } from '@/features/students/queries';
import { PageHeader } from '@/ui/PageHeader';
import { db } from '@/db/client';
import { teachingAssignments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export default async function ScoreSheetPage({ params }: { params: Promise<{ school: string; classId: string; subjectId: string }> }) {
  const { school, classId, subjectId } = await params;
  const viewer = await requireViewer(school);
  const canEdit = canEnterScores(viewer, classId, subjectId);
  allow(canEdit || viewer.role === 'headteacher');
  const [schoolClass, subjects, staff] = await Promise.all([getClass(viewer.school.id, classId), getSubjects(viewer.school.id), getStaff(viewer.school.id)]);
  const subject = subjects.find((s) => s.id === subjectId);
  if (!schoolClass || !subject || schoolClass.academicYear !== viewer.currentTerm.academicYear) notFound();
  const [assignment] = await db.select().from(teachingAssignments).where(and(eq(teachingAssignments.classId, classId), eq(teachingAssignments.subjectId, subjectId)));
  const roll = (await classRoll(viewer.school.id, classId)).filter((s) => s.status === 'Active');
  const scores = await termScores(viewer.school.id, viewer.currentTerm.id, roll.map((s) => s.id));

  return (
    <>
      <PageHeader
        title={`${schoolClass.name} ${subject.name}`}
        meta={`${termLabel(viewer.currentTerm)} · ${staffName(staff.find((s) => s.id === assignment?.teacherId))}${canEdit ? '' : ' · View only'}`}
        breadcrumb={<Link href={`/${school}/scores`}>Score sheets</Link>}
      />
      <ScoreSheetForm
        action={saveScores.bind(null, school, classId, subjectId)}
        level={schoolClass.level}
        readOnly={!canEdit}
        rows={roll.map((student) => {
          const score = scores.find((s) => s.studentId === student.id && s.subjectId === subjectId);
          return {
            studentId: student.id,
            admissionNo: student.admissionNo,
            name: studentRegisterName(student),
            classScore: score?.classScore ?? null,
            examScore: score?.examScore ?? null,
          };
        })}
      />
    </>
  );
}
