'use server';

import { and, eq, like, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { classes, enrolments, guardians, studentMovements, students } from '@/db/schema';
import { recordActivity } from '@/features/activity/record';
import { canAdmitStudents, canRecordExits } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { schoolChanged } from '@/lib/revalidate';
import { formValues, type FormState } from '@/ui/formState';
import { normalisePhone } from '@/ui/format';
import { admissionNoToSlug, slugToAdmissionNo } from './names';

export interface StudentFormState {
  error?: string;
  values?: Record<string, string>;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function admitStudent(schoolSlug: string, _previous: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canAdmitStudents(viewer)) return { error: 'Only the headteacher or bursar can admit students.' };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));
  const fail = (error: string) => ({ error, values });

  if (!values.surname || !values.firstName) return fail('Enter the student’s surname and first name.');
  if (values.gender !== 'M' && values.gender !== 'F') return fail('Choose the student’s sex.');
  if (!isoDate.test(values.dateOfBirth) || values.dateOfBirth > todayIso()) return fail('Enter a valid date of birth.');
  if (!isoDate.test(values.admittedOn) || values.admittedOn > todayIso()) return fail('The admission date cannot be in the future.');
  const [schoolClass] = await db.select().from(classes).where(and(eq(classes.schoolId, viewer.school.id), eq(classes.id, values.classId)));
  if (!schoolClass || schoolClass.academicYear !== viewer.currentTerm.academicYear) return fail('Choose a class for this academic year.');
  const admissionType = values.admissionType === 'Transfer in' ? 'Transfer in' : 'New admission';
  if (admissionType === 'Transfer in' && !values.previousSchool) return fail('Enter the school the student is transferring from.');

  let guardianId: string;
  if (values.siblingAdmissionNo) {
    const [sibling] = await db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, viewer.school.id), eq(students.admissionNo, slugToAdmissionNo(values.siblingAdmissionNo.toUpperCase()))));
    if (!sibling?.guardianId) return fail(`No student with admission number ${values.siblingAdmissionNo} has a guardian on record. Check the number or enter the guardian below.`);
    guardianId = sibling.guardianId;
  } else {
    if (!values.guardianName) return fail('Enter the parent or guardian’s name, or a sibling’s admission number.');
    if (!values.guardianTitle || !values.relationship) return fail('Choose the guardian’s title and relationship to the student.');
    const phone = values.guardianPhone ? normalisePhone(values.guardianPhone) : null;
    if (values.guardianPhone && !phone) return fail('The guardian phone number should be 10 digits, like 024 412 6630.');
    const altPhone = values.guardianAltPhone ? normalisePhone(values.guardianAltPhone) : null;
    if (values.guardianAltPhone && !altPhone) return fail('The other phone number should be 10 digits, like 020 816 2274.');
    const [guardian] = await db
      .insert(guardians)
      .values({
        schoolId: viewer.school.id,
        title: values.guardianTitle,
        name: values.guardianName,
        relationship: values.relationship,
        phone: phone ?? null,
        altPhone: altPhone ?? null,
        occupation: values.occupation || null,
        residence: values.residence || null,
      })
      .returning();
    guardianId = guardian.id;
  }

  const year = values.admittedOn.slice(0, 4);
  const admissionNo = await db.transaction(async (tx) => {
    // Serialise admissions per school and year so two clerks never issue the same number.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${viewer.school.id + year}))`);
    const [{ last }] = await tx
      .select({ last: sql<string | null>`max(${students.admissionNo})` })
      .from(students)
      .where(and(eq(students.schoolId, viewer.school.id), like(students.admissionNo, `STU/${year}/%`)));
    const next = (last ? Number(last.split('/')[2]) : 0) + 1;
    const number = `STU/${year}/${String(next).padStart(4, '0')}`;
    const [student] = await tx
      .insert(students)
      .values({
        schoolId: viewer.school.id,
        admissionNo: number,
        surname: values.surname,
        firstName: values.firstName,
        otherNames: values.otherNames || null,
        gender: values.gender as 'M' | 'F',
        dateOfBirth: values.dateOfBirth,
        guardianId,
        status: 'Active',
        admittedOn: values.admittedOn,
        admissionType,
        previousSchool: values.previousSchool || null,
        medicalNotes: values.medicalNotes || null,
      })
      .returning();
    await tx.insert(enrolments).values({ schoolId: viewer.school.id, studentId: student.id, academicYear: schoolClass.academicYear, classId: schoolClass.id });
    await tx.insert(studentMovements).values({
      schoolId: viewer.school.id,
      studentId: student.id,
      kind: admissionType === 'Transfer in' ? 'Transfer in' : 'Admission',
      date: values.admittedOn,
      details: `${admissionType === 'Transfer in' ? 'Transferred in' : 'Admitted'} into ${schoolClass.name}.${values.previousSchool ? ` From ${values.previousSchool}.` : ''}`,
      recordedBy: viewer.staff?.id ?? null,
    });
    return number;
  });

  await recordActivity(viewer, 'Students', `Admitted ${values.firstName} ${values.surname} (${admissionNo}) into ${schoolClass.name}`, `/students/${admissionNoToSlug(admissionNo)}`);
  schoolChanged(viewer);
  redirect(`/${schoolSlug}/students/${admissionNoToSlug(admissionNo)}?admitted=1`);
}

export async function recordExit(schoolSlug: string, studentId: string, _previous: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canRecordExits(viewer)) return { error: 'Only the headteacher can record withdrawals and transfers.' };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));
  const kind = values.kind === 'Transfer out' ? 'Transfer out' : 'Withdrawal';
  if (!isoDate.test(values.date) || values.date > todayIso()) return { error: 'The date cannot be in the future.', values };
  if (kind === 'Transfer out' && !values.destination) return { error: 'Enter the school the student is moving to.', values };
  if (!values.reason) return { error: 'Enter the reason given by the parent or school.', values };

  const [student] = await db.select().from(students).where(and(eq(students.schoolId, viewer.school.id), eq(students.id, studentId)));
  if (!student || student.status !== 'Active') return { error: 'This student is no longer active. Their exit is already recorded.', values };
  if (values.date < student.admittedOn) return { error: 'The exit date cannot be before the admission date.', values };
  const details = kind === 'Transfer out' ? `Transferred to ${values.destination}. ${values.reason}` : values.reason;

  await db.transaction(async (tx) => {
    await tx
      .update(students)
      .set({ status: kind === 'Transfer out' ? 'Transferred out' : 'Withdrawn', exitedOn: values.date, exitReason: details })
      .where(eq(students.id, student.id));
    await tx
      .update(enrolments)
      .set({ outcome: kind === 'Transfer out' ? 'Transferred out' : 'Withdrawn' })
      .where(and(eq(enrolments.studentId, student.id), eq(enrolments.academicYear, viewer.currentTerm.academicYear)));
    await tx.insert(studentMovements).values({ schoolId: viewer.school.id, studentId: student.id, kind, date: values.date, details, recordedBy: viewer.staff?.id ?? null });
  });

  await recordActivity(viewer, 'Students', `Recorded ${kind.toLowerCase()} of ${student.firstName} ${student.surname} (${student.admissionNo})`, `/students/${admissionNoToSlug(student.admissionNo)}`);
  schoolChanged(viewer);
  redirect(`/${schoolSlug}/students/${admissionNoToSlug(student.admissionNo)}`);
}

export async function updateStudentDetails(schoolSlug: string, studentId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(schoolSlug);
  if (!canAdmitStudents(viewer)) return { error: 'Only the headteacher or bursar can change student details.' };
  const v = formValues(formData);
  if (!v.surname || !v.firstName) return { error: 'Enter the student’s surname and first name.' };
  if (v.gender !== 'M' && v.gender !== 'F') return { error: 'Choose the student’s sex.' };
  if (!isoDate.test(v.dateOfBirth) || v.dateOfBirth > todayIso()) return { error: 'Enter a valid date of birth.' };
  const [student] = await db.select().from(students).where(and(eq(students.schoolId, viewer.school.id), eq(students.id, studentId)));
  if (!student) return { error: 'This student record no longer exists.' };

  const phone = v.guardianPhone ? normalisePhone(v.guardianPhone) : null;
  if (v.guardianPhone && !phone) return { error: 'The guardian phone number should be 10 digits, like 024 412 6630.' };
  const altPhone = v.guardianAltPhone ? normalisePhone(v.guardianAltPhone) : null;
  if (v.guardianAltPhone && !altPhone) return { error: 'The other phone number should be 10 digits, like 020 816 2274.' };
  if (student.guardianId && (!v.guardianName || !v.guardianTitle || !v.relationship)) return { error: 'Enter the guardian’s title, name and relationship.' };

  await db.transaction(async (tx) => {
    await tx
      .update(students)
      .set({ surname: v.surname, firstName: v.firstName, otherNames: v.otherNames || null, gender: v.gender as 'M' | 'F', dateOfBirth: v.dateOfBirth, medicalNotes: v.medicalNotes || null })
      .where(eq(students.id, student.id));
    if (student.guardianId) {
      await tx
        .update(guardians)
        .set({ title: v.guardianTitle, name: v.guardianName, relationship: v.relationship, phone, altPhone, occupation: v.occupation || null, residence: v.residence || null })
        .where(and(eq(guardians.schoolId, viewer.school.id), eq(guardians.id, student.guardianId)));
    }
    await recordActivity(viewer, 'Students', `Updated details for ${v.firstName} ${v.surname} (${student.admissionNo})`, `/students/${admissionNoToSlug(student.admissionNo)}`, tx);
  });
  schoolChanged(viewer);
  return { saved: 'Details saved.' };
}
