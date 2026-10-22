import type { AttendanceStatus } from '@/features/attendance/types';
import { feeAccountHistory, roundMoney, type FeeLedgerInput } from '@/features/fees/accounts';
import type { FeeItem, FeePayment, PaymentMethod } from '@/features/fees/types';
import { addDays, schoolDaysBetween, termsOfYear, todayIso } from '@/features/school/calendar';
import { PROMOTION_PASS_MARK, totalScore } from '@/features/school/grading';
import { subjectsFor } from '@/features/school/subjects';
import type { SchoolClass, Term } from '@/features/school/types';
import type { Enrolment, Student, StudentMovement } from '@/features/students/types';
import { createRandom, type Random } from '../random';
import { calendarTerms, curriculumSubjects } from './curriculum';
import { SEED_SCHOOL_ID, type SeedDataset } from './dataset';
import { femaleFirstNames, maleFirstNames } from './names';
import { DEMO_PASSWORD, seedClasses, seedStaff, seedStaffAccounts, seedTeachingAssignments } from './seedStaffAndClasses';
import { StudentFactory } from './seedStudents';

// The demo follows the real date inside the 1st term, so attendance and payments look current when it is opened.
export const SEED_TODAY = process.env.SEED_TODAY ?? clampDate(todayIso(), '2026-10-21', '2026-12-16');
const CURRENT_TERM_ID = '2026-27-T1';
const HEADTEACHER_ID = 'STF/003';
const BURSAR_ID = 'STF/011';
const ACCOUNTS_CLERK_ID = 'STF/024';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function clampDate(isoDate: string, earliest: string, latest: string): string {
  return isoDate < earliest ? earliest : isoDate > latest ? latest : isoDate;
}

export function createSeedData(): SeedDataset {
  const random = createRandom(20260908);
  const staff = seedStaff();
  const subjects = curriculumSubjects();
  const classes = seedClasses();
  const data: SeedDataset = {
    school: {
      slug: 'adom-heights',
      name: 'Adom Heights Academy',
      shortName: 'AH',
      address: 'P.O. Box TN 2217, Teshie-Nungua. Off Spintex Road',
      phone: '030 254 7816',
      email: 'office@adomheights.edu.gh',
      accentColor: '#1f5c4a',
      currentTermId: CURRENT_TERM_ID,
    },
    terms: calendarTerms(),
    subjects,
    staff,
    accounts: seedStaffAccounts(staff),
    classes,
    teachingAssignments: seedTeachingAssignments(classes, subjects),
    students: [],
    guardians: [],
    enrolments: [],
    movements: [],
    attendanceSheets: [],
    attendanceEntries: [],
    attendanceSummaries: [],
    scores: [],
    reportRemarks: [],
    feeItems: [],
    scholarships: [],
    payments: [],
    openingBalances: [],
  };
  data.feeItems = seedFeeItems(data.terms);

  const factory = new StudentFactory(data, random);
  seedPreviousYear(data, factory, random);
  seedCurrentYear(data, factory, random);
  seedCurrentTermAttendance(data, factory, random);
  seedCurrentTermScores(data, factory, random);
  seedScholarships(data, random);
  seedPayments(data, factory, random);
  data.accounts.push({ username: 'kagyeman', password: DEMO_PASSWORD, staffId: null, guardianId: 'GRD-0001' });
  return data;
}

function termById(data: SeedDataset, termId: string): Term {
  return data.terms.find((t) => t.id === termId)!;
}

function classesOf(data: SeedDataset, academicYear: string): SchoolClass[] {
  return data.classes.filter((c) => c.academicYear === academicYear);
}

function classSubjects(data: SeedDataset, schoolClass: SchoolClass) {
  return subjectsFor(data.subjects, schoolClass.level, schoolClass.programme);
}

function addEnrolment(data: SeedDataset, studentId: string, schoolClass: SchoolClass) {
  data.enrolments.push({ schoolId: SEED_SCHOOL_ID, studentId, academicYear: schoolClass.academicYear, classId: schoolClass.id, outcome: null });
}

function addMovement(data: SeedDataset, movement: Omit<StudentMovement, 'id' | 'schoolId' | 'recordedBy'>) {
  data.movements.push({
    id: `MOV-${String(data.movements.length + 1).padStart(4, '0')}`,
    schoolId: SEED_SCHOOL_ID,
    recordedBy: HEADTEACHER_ID,
    ...movement,
  });
}

function exitStudent(data: SeedDataset, student: Student, enrolment: Enrolment, kind: 'Withdrawal' | 'Transfer out', date: string, reason: string) {
  student.status = kind === 'Withdrawal' ? 'Withdrawn' : 'Transferred out';
  student.exitedOn = date;
  student.exitReason = reason;
  enrolment.outcome = kind === 'Withdrawal' ? 'Withdrawn' : 'Transferred out';
  addMovement(data, { studentId: student.id, kind, date, details: reason });
}

function wasInSchoolForTerm(student: Student, term: Term): boolean {
  return student.admittedOn <= term.startsOn && (!student.exitedOn || student.exitedOn > term.endsOn);
}

function seedPreviousYear(data: SeedDataset, factory: StudentFactory, random: Random) {
  const academicYear = '2025/2026';
  const yearClasses = classesOf(data, academicYear);

  const agyemanFather = factory.addGuardian({
    title: 'Mr.',
    name: 'Kofi Agyeman',
    relationship: 'Father',
    phone: '024 517 3086',
    altPhone: '020 117 4458',
    occupation: 'Accountant',
    residence: 'Adenta',
  });

  for (const schoolClass of yearClasses) {
    const classSize = random.int(21, 26);
    const usualAdmissionYear = 2025 - (schoolClass.yearGroup <= 9 ? schoolClass.yearGroup - 7 : schoolClass.yearGroup - 10);
    for (let i = 0; i < classSize; i++) {
      const transferIn = usualAdmissionYear < 2025 && random.chance(0.1);
      const admittedOn = transferIn
        ? `${usualAdmissionYear + 1}-0${random.int(1, 5)}-${random.int(10, 27)}`
        : `${usualAdmissionYear}-09-${schoolClass.yearGroup >= 10 ? '15' : '08'}`;
      const student =
        schoolClass.id === '2526-b7a' && i === 0
          ? factory.createStudent({ schoolClass, admittedOn, firstName: 'Ama', surname: 'Agyeman', gender: 'F', guardian: agyemanFather, ability: 71 })
          : factory.createStudent({ schoolClass, admittedOn, admissionType: transferIn ? 'Transfer in' : 'New admission' });
      addEnrolment(data, student.id, schoolClass);
      if (student.admittedOn >= '2025-09-01') {
        addMovement(data, {
          studentId: student.id,
          kind: student.admissionType === 'Transfer in' ? 'Transfer in' : 'Admission',
          date: student.admittedOn,
          details: `Admitted into ${schoolClass.name}. From ${student.previousSchool}.`,
        });
      }
      if (usualAdmissionYear < 2025 && random.chance(0.12)) {
        data.openingBalances.push({
          schoolId: SEED_SCHOOL_ID,
          studentId: student.id,
          amount: random.int(6, 58) * 25 + (random.chance(0.3) ? 12.5 : 0),
          note: 'Balance from 3rd Term 2024/2025 (manual ledger)',
        });
      }
    }
  }

  const exits: [string, number, 'Withdrawal' | 'Transfer out', string, string][] = [
    ['2526-b8b', 4, 'Transfer out', '2026-01-09', "Transferred to St. Paul's Basic School, Kumasi. Father posted to Kumasi."],
    ['2526-b7b', 7, 'Withdrawal', '2026-02-17', 'Family relocated to Takoradi.'],
    ['2526-b9a', 11, 'Withdrawal', '2026-05-12', 'Withdrawn by parent. Fees could not be paid.'],
  ];
  for (const [classId, position, kind, date, reason] of exits) {
    const enrolment = data.enrolments.filter((e) => e.classId === classId)[position];
    const student = data.students.find((s) => s.id === enrolment.studentId)!;
    exitStudent(data, student, enrolment, kind, date, reason);
  }

  const yearTerms = termsOfYear(data.terms, academicYear);
  for (const term of yearTerms) {
    for (const enrolment of data.enrolments.filter((e) => e.academicYear === academicYear)) {
      const student = data.students.find((s) => s.id === enrolment.studentId)!;
      const schoolClass = yearClasses.find((c) => c.id === enrolment.classId)!;
      const joinedMidTerm = student.admittedOn > term.startsOn && student.admittedOn <= term.endsOn;
      if (!wasInSchoolForTerm(student, term) && !joinedMidTerm) continue;
      seedTermScores(data, factory, random, student, schoolClass, term);
      seedAttendanceSummary(data, factory, random, student, term);
    }
    seedTermRemarks(data, random, term);
  }

  for (const enrolment of data.enrolments.filter((e) => e.academicYear === academicYear && !e.outcome)) {
    const schoolClass = yearClasses.find((c) => c.id === enrolment.classId)!;
    const average = annualAverage(data, enrolment.studentId, yearTerms);
    const student = data.students.find((s) => s.id === enrolment.studentId)!;
    if (schoolClass.yearGroup === 9) {
      enrolment.outcome = 'Completed';
      student.status = 'Completed';
      student.exitedOn = '2026-07-24';
      student.exitReason = 'Completed JHS. Wrote BECE 2026.';
    } else if (average < PROMOTION_PASS_MARK && schoolClass.level === 'JHS') {
      enrolment.outcome = random.chance(0.6) ? 'Repeated' : 'Promoted on trial';
      if (enrolment.outcome === 'Repeated') {
        addMovement(data, {
          studentId: student.id,
          kind: 'Repeat',
          date: '2026-07-24',
          details: `To repeat ${yearGroupName(schoolClass)}. Annual average ${average.toFixed(1)}.`,
        });
      }
    } else {
      enrolment.outcome = 'Promoted';
    }
  }

  const finalTerm = yearTerms[2];
  for (const remarks of data.reportRemarks.filter((r) => r.termId === finalTerm.id)) {
    const enrolment = data.enrolments.find((e) => e.studentId === remarks.studentId && e.academicYear === academicYear)!;
    const schoolClass = yearClasses.find((c) => c.id === enrolment.classId)!;
    const nextGroup = schoolClass.yearGroup < 9 ? `Basic ${schoolClass.yearGroup + 1}` : `SHS ${schoolClass.yearGroup - 8}`;
    const decision =
      enrolment.outcome === 'Promoted'
        ? `Promoted to ${nextGroup}.`
        : enrolment.outcome === 'Promoted on trial'
          ? `Promoted to ${nextGroup} on trial.`
          : enrolment.outcome === 'Repeated'
            ? `To repeat ${yearGroupName(schoolClass)}.`
            : 'Completed JHS.';
    remarks.headteacherRemark = `${remarks.headteacherRemark} ${decision}`;
  }
}

function yearGroupName(schoolClass: SchoolClass): string {
  return schoolClass.yearGroup <= 9 ? `Basic ${schoolClass.yearGroup}` : `SHS ${schoolClass.yearGroup - 9}`;
}

function seedTermScores(data: SeedDataset, factory: StudentFactory, random: Random, student: Student, schoolClass: SchoolClass, term: Term) {
  const profile = factory.profiles.get(student.id)!;
  const termIndex = Number(term.code.slice(-1));
  for (const subject of classSubjects(data, schoolClass)) {
    const expected = profile.ability + factory.subjectBias(student.id, subject.id) + termIndex * 0.8 + random.normal(0, 5);
    data.scores.push({
      schoolId: SEED_SCHOOL_ID,
      termId: term.id,
      studentId: student.id,
      subjectId: subject.id,
      classScore: clamp(Math.round(expected * 0.3 + random.normal(2, 2)), 4, 30),
      examScore: clamp(Math.round(expected + random.normal(-2, 7)), 6, 98),
      updatedBy: null,
      updatedAt: null,
    });
  }
}

function annualAverage(data: SeedDataset, studentId: string, yearTerms: Term[]): number {
  const termIds = new Set(yearTerms.map((t) => t.id));
  const totals = data.scores
    .filter((s) => s.studentId === studentId && termIds.has(s.termId) && s.classScore !== null && s.examScore !== null)
    .map((s) => totalScore(s.classScore!, s.examScore!));
  return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
}

function seedAttendanceSummary(data: SeedDataset, factory: StudentFactory, random: Random, student: Student, term: Term) {
  const profile = factory.profiles.get(student.id)!;
  const from = student.admittedOn > term.startsOn ? student.admittedOn : term.startsOn;
  const daysOpen = schoolDaysBetween(from, term.endsOn).length;
  const absent = clamp(Math.round(daysOpen * profile.absentRate + random.normal(0, 1.2)), 0, daysOpen);
  const excused = clamp(Math.round(daysOpen * profile.excusedRate + random.normal(0, 0.8)), 0, daysOpen - absent);
  const late = clamp(Math.round(daysOpen * profile.lateRate + random.normal(0, 1)), 0, daysOpen - absent - excused);
  data.attendanceSummaries.push({
    schoolId: SEED_SCHOOL_ID,
    termId: term.id,
    studentId: student.id,
    daysOpen,
    present: daysOpen - absent - excused - late,
    late,
    excused,
    absent,
  });
}

const conductOptions = ['Respectful', 'Obedient', 'Well behaved', 'Quiet but attentive', 'Disciplined', 'Can be playful in class', 'Must improve punctuality', 'Helpful to classmates'];
const interestOptions = ['Football', 'Reading', 'Drawing', 'Music', 'Debating', 'Athletics', 'Netball', 'Cooking', 'Volleyball', 'Coding club', 'Choir', 'Table tennis'];

function seedTermRemarks(data: SeedDataset, random: Random, term: Term) {
  const termScores = data.scores.filter((s) => s.termId === term.id);
  const studentIds = [...new Set(termScores.map((s) => s.studentId))];
  for (const studentId of studentIds) {
    const totals = termScores
      .filter((s) => s.studentId === studentId)
      .map((s) => ({ subjectId: s.subjectId, total: totalScore(s.classScore ?? 0, s.examScore ?? 0) }));
    const average = totals.reduce((sum, t) => sum + t.total, 0) / totals.length;
    const weakest = totals.reduce((low, t) => (t.total < low.total ? t : low));
    const weakestName = data.subjects.find((s) => s.id === weakest.subjectId)!.name;
    const classTeacherRemark =
      average >= 72
        ? random.pick(['Excellent performance. Keep it up.', 'Hardworking and focused. Maintain this standard.', 'A very good term. Continue to lead by example.'])
        : average >= 58
          ? random.pick([`Good work this term. Can do better in ${weakestName}.`, 'Steady progress. More reading will help.', 'Good effort. Should participate more in class.'])
          : average >= 45
            ? random.pick(['Fair performance. Needs to put in more effort.', `Capable of better results. Should give more time to ${weakestName}.`, 'Average work. Must complete homework on time.'])
            : random.pick([`Weak performance. Needs extra support in ${weakestName}.`, 'Must take studies more seriously.', 'Poor results. Parent should monitor studies at home.']);
    const headteacherRemark =
      average >= 72
        ? random.pick(['Very good results.', 'Excellent. Keep it up.'])
        : average >= 58
          ? random.pick(['Good. Aim higher.', 'Good work.'])
          : average >= 45
            ? random.pick(['Can do better.', 'Fair. More effort needed.'])
            : 'Parent to see the Headteacher.';
    data.reportRemarks.push({
      schoolId: SEED_SCHOOL_ID,
      termId: term.id,
      studentId,
      conduct: random.pick(conductOptions),
      interest: random.pick(interestOptions),
      classTeacherRemark,
      headteacherRemark,
    });
  }
}

function seedCurrentYear(data: SeedDataset, factory: StudentFactory, random: Random) {
  const previous = data.enrolments.filter((e) => e.academicYear === '2025/2026');
  const classByKey = (key: string) => data.classes.find((c) => c.id === `2627-${key}`)!;
  const keyOf = (classId: string) => classId.split('-')[1];
  const promotedTo: Record<string, string> = { b7a: 'b8a', b7b: 'b8b', b8a: 'b9a', b8b: 'b9b', s1sci: 's2sci', s1bus: 's2bus' };

  for (const enrolment of previous) {
    const key = keyOf(enrolment.classId);
    const nextKey =
      enrolment.outcome === 'Promoted' || enrolment.outcome === 'Promoted on trial'
        ? promotedTo[key]
        : enrolment.outcome === 'Repeated'
          ? key
          : undefined;
    if (nextKey) addEnrolment(data, enrolment.studentId, classByKey(nextKey));
  }

  const agyemanFather = data.guardians.find((g) => g.name === 'Kofi Agyeman')!;
  const intake: [string, number][] = [['b7a', random.int(23, 26)], ['b7b', random.int(22, 25)], ['s1sci', random.int(24, 27)], ['s1art', random.int(18, 21)]];
  for (const [key, targetSize] of intake) {
    const schoolClass = classByKey(key);
    const existing = data.enrolments.filter((e) => e.classId === schoolClass.id).length;
    for (let i = existing; i < targetSize; i++) {
      const student =
        key === 's1sci' && i === existing
          ? factory.createStudent({ schoolClass, admittedOn: '2026-09-08', firstName: 'Kwame', surname: 'Agyeman', gender: 'M', guardian: agyemanFather, ability: 64 })
          : factory.createStudent({ schoolClass, admittedOn: schoolClass.level === 'SHS' ? `2026-09-${random.pick(['08', '08', '08', '14', '21'])}` : '2026-09-08' });
      addEnrolment(data, student.id, schoolClass);
      addMovement(data, {
        studentId: student.id,
        kind: 'Admission',
        date: student.admittedOn,
        details:
          schoolClass.level === 'SHS'
            ? `Placed through CSSPS into ${schoolClass.name}. From ${student.previousSchool}.`
            : `Admitted into ${schoolClass.name}. From ${student.previousSchool}.`,
      });
    }
  }

  const transfers: [string, string, string][] = [
    ['b8b', '2026-09-08', 'Achimota Basic School'],
    ['b9a', '2026-09-15', 'Tema Community 8 No. 2 JHS'],
    ['s2sci', '2026-09-22', 'Accra Wesley Girls High School'],
    ['b8a', '2026-10-05', 'Ashaiman Seventh-Day Adventist JHS'],
  ];
  for (const [key, admittedOn, fromSchool] of transfers) {
    const schoolClass = classByKey(key);
    const student = factory.createStudent({ schoolClass, admittedOn, admissionType: 'Transfer in', gender: key === 's2sci' ? 'F' : undefined });
    student.previousSchool = fromSchool;
    addEnrolment(data, student.id, schoolClass);
    addMovement(data, { studentId: student.id, kind: 'Transfer in', date: admittedOn, details: `Transferred in from ${fromSchool} into ${schoolClass.name}.` });
  }

  const currentExits: [string, number, 'Withdrawal' | 'Transfer out', string, string][] = [
    ['2627-b9b', 3, 'Transfer out', '2026-09-29', 'Transferred to Presbyterian Boys JHS, Legon.'],
    ['2627-b8a', 9, 'Withdrawal', '2026-10-09', 'Relocated to Kumasi with family.'],
  ];
  for (const [classId, position, kind, date, reason] of currentExits) {
    const enrolment = data.enrolments.filter((e) => e.classId === classId)[position];
    const student = data.students.find((s) => s.id === enrolment.studentId)!;
    if (student.surname === 'Agyeman') continue;
    exitStudent(data, student, enrolment, kind, date, reason);
  }
}

function seedCurrentTermAttendance(data: SeedDataset, factory: StudentFactory, random: Random) {
  const term = termById(data, CURRENT_TERM_ID);
  const days = schoolDaysBetween(term.startsOn, SEED_TODAY);
  const markedToday = new Set(['2627-b7a', '2627-b7b', '2627-b8a', '2627-s1sci', '2627-s2sci', '2627-s2bus', '2627-b9a']);
  const missedSheets = new Set(['2627-b9b|2026-10-02', '2627-b9b|2026-10-16', '2627-s1art|2026-09-25']);
  const excuseNotes = ['Hospital visit', 'Funeral of grandmother', 'Sick. Note from parent', 'Inter-schools athletics', 'Travelled with parent', 'Dental appointment'];

  for (const schoolClass of classesOf(data, term.academicYear)) {
    const roll = data.enrolments.filter((e) => e.classId === schoolClass.id).map((e) => data.students.find((s) => s.id === e.studentId)!);
    for (const date of days) {
      if (date === SEED_TODAY && !markedToday.has(schoolClass.id)) continue;
      if (missedSheets.has(`${schoolClass.id}|${date}`)) continue;
      const sheetId = `ATT-${schoolClass.id}-${date}`;
      data.attendanceSheets.push({
        id: sheetId,
        schoolId: SEED_SCHOOL_ID,
        classId: schoolClass.id,
        date,
        markedBy: schoolClass.classTeacherId,
        markedAt: `${date}T07:${String(random.int(32, 59)).padStart(2, '0')}:00Z`,
      });
      for (const student of roll) {
        if (student.admittedOn > date || (student.exitedOn && student.exitedOn <= date)) continue;
        const profile = factory.profiles.get(student.id)!;
        const r = random.next();
        let status: AttendanceStatus = 'present';
        if (r < profile.absentRate) status = 'absent';
        else if (r < profile.absentRate + profile.excusedRate) status = 'excused';
        else if (r < profile.absentRate + profile.excusedRate + profile.lateRate) status = 'late';
        data.attendanceEntries.push({ sheetId, studentId: student.id, status, note: status === 'excused' ? random.pick(excuseNotes) : null });
      }
    }
  }
}

function seedCurrentTermScores(data: SeedDataset, factory: StudentFactory, random: Random) {
  const term = termById(data, CURRENT_TERM_ID);
  for (const schoolClass of classesOf(data, term.academicYear)) {
    const roll = data.enrolments
      .filter((e) => e.classId === schoolClass.id)
      .map((e) => data.students.find((s) => s.id === e.studentId)!)
      .filter((s) => !s.exitedOn);
    for (const subject of classSubjects(data, schoolClass)) {
      const progress = random.next();
      const share = progress < 0.5 ? 1 : progress < 0.8 ? random.int(55, 90) / 100 : 0;
      for (const student of roll.slice(0, Math.round(roll.length * share))) {
        const profile = factory.profiles.get(student.id)!;
        const expected = profile.ability + factory.subjectBias(student.id, subject.id) + random.normal(0, 5);
        data.scores.push({
          schoolId: SEED_SCHOOL_ID,
          termId: term.id,
          studentId: student.id,
          subjectId: subject.id,
          classScore: clamp(Math.round(expected * 0.3 + random.normal(2, 2)), 4, 30),
          examScore: null,
          updatedBy: null,
          updatedAt: null,
        });
      }
    }
  }
}

function seedFeeItems(terms: Term[]): FeeItem[] {
  const items: FeeItem[] = [];
  const schedule: Record<string, { JHS: [string, number][]; SHS: [string, number][]; science: number }> = {
    '2025/2026': {
      JHS: [['Tuition', 1350], ['PTA levy', 100], ['ICT', 80], ['Examination fee', 65], ['Sports and culture', 35], ['Maintenance', 50]],
      SHS: [['Tuition', 1850], ['PTA levy', 120], ['ICT', 95], ['Examination fee', 85], ['Sports and culture', 45], ['Maintenance', 60]],
      science: 150,
    },
    '2026/2027': {
      JHS: [['Tuition', 1450], ['PTA levy', 120], ['ICT', 85], ['Examination fee', 70], ['Sports and culture', 40], ['Maintenance', 55]],
      SHS: [['Tuition', 1980], ['PTA levy', 150], ['ICT', 100], ['Examination fee', 90], ['Sports and culture', 50], ['Maintenance', 65]],
      science: 175,
    },
  };
  for (const [academicYear, levels] of Object.entries(schedule)) {
    for (const term of termsOfYear(terms, academicYear)) {
      for (const level of ['JHS', 'SHS'] as const) {
        for (const [name, amount] of levels[level]) {
          items.push({ id: `FEE-${items.length + 1}`, schoolId: SEED_SCHOOL_ID, termId: term.id, level, programme: null, name, amount, isTuition: name === 'Tuition' });
        }
      }
      items.push({ id: `FEE-${items.length + 1}`, schoolId: SEED_SCHOOL_ID, termId: term.id, level: 'SHS', programme: 'Science', name: 'Science practicals', amount: levels.science, isTuition: false });
    }
  }
  return items;
}

function seedScholarships(data: SeedDataset, random: Random) {
  const active = (classId: string) =>
    data.enrolments
      .filter((e) => e.classId === classId)
      .map((e) => e.studentId)
      .filter((id) => !data.students.find((s) => s.id === id)!.exitedOn);
  const ama = data.students.find((s) => s.firstName === 'Ama' && s.surname === 'Agyeman')!;
  const rows: [string, string, 'percentOfTuition' | 'fixedPerTerm', number, string, string | null, string][] = [
    [ama.id, 'Sibling discount', 'percentOfTuition', 10, '2026-27-T1', null, 'Two children in the school from 2026/2027.'],
    [random.pick(active('2627-b9a')), 'Staff child', 'percentOfTuition', 50, '2025-26-T1', null, 'Child of teaching staff.'],
    [random.pick(active('2627-b8b')), 'Staff child', 'percentOfTuition', 50, '2025-26-T1', null, 'Child of non-teaching staff.'],
    [random.pick(active('2627-s2sci')), 'Old Students Association scholarship', 'percentOfTuition', 100, '2025-26-T1', '2026-27-T3', 'Best BECE result among 2025 intake. Renewed yearly if average stays above 70.'],
    [random.pick(active('2627-b7b')), 'PTA needy student support', 'fixedPerTerm', 600, '2026-27-T1', '2026-27-T3', 'Approved at PTA meeting of 29 August 2026.'],
    [random.pick(active('2627-b9b')), 'PTA needy student support', 'fixedPerTerm', 450, '2025-26-T2', '2026-27-T1', 'Mother lost her shop in the Kantamanto fire.'],
    [random.pick(active('2627-s1art')), 'District Assembly bursary', 'fixedPerTerm', 800, '2026-27-T1', null, 'Ga East Municipal bursary scheme.'],
  ];
  rows.forEach(([studentId, name, basis, value, fromTermId, toTermId, notes], index) => {
    data.scholarships.push({
      id: `SCH-${index + 1}`,
      schoolId: SEED_SCHOOL_ID,
      studentId,
      name,
      basis,
      value,
      fromTermId,
      toTermId,
      approvedBy: HEADTEACHER_ID,
      notes,
    });
  });
}

function ledgerInput(data: SeedDataset, student: Student): FeeLedgerInput {
  return {
    student,
    terms: data.terms,
    classes: data.classes,
    enrolments: data.enrolments.filter((e) => e.studentId === student.id),
    feeItems: data.feeItems,
    scholarships: data.scholarships.filter((s) => s.studentId === student.id),
    payments: data.payments.filter((p) => p.studentId === student.id),
    openingBalance: data.openingBalances.find((b) => b.studentId === student.id)?.amount ?? 0,
  };
}

function roundToFifty(amount: number): number {
  return Math.max(50, Math.round(amount / 50) * 50);
}

function seedPayments(data: SeedDataset, factory: StudentFactory, random: Random) {
  for (const termId of ['2025-26-T1', '2025-26-T2', '2025-26-T3', CURRENT_TERM_ID]) {
    const term = termById(data, termId);
    const lastPaymentDay = termId === CURRENT_TERM_ID ? SEED_TODAY : addDays(term.endsOn, -3);
    const termDays = schoolDaysBetween(addDays(term.startsOn, -6), addDays(term.endsOn, -3));

    for (const student of data.students) {
      const history = feeAccountHistory(ledgerInput(data, student), termId);
      const account = history.find((a) => a.termId === termId);
      const owedBefore = history.length ? history[history.length - 1].balance : 0;
      const guardian = data.guardians.find((g) => g.id === student.guardianId)!;
      const guardianName = `${guardian.title} ${guardian.name}`;

      if (!account) {
        if (owedBefore > 0 && student.status === 'Completed' && random.chance(0.35)) {
          const day = random.pick(termDays.filter((d) => d <= lastPaymentDay));
          data.payments.push(newPayment(student.id, termId, owedBefore, day, guardianName, random));
        }
        continue;
      }

      const due = roundMoney(account.arrearsBroughtForward + account.chargesTotal - account.discountTotal);
      if (due <= 0) continue;
      const { payerHabit } = factory.profiles.get(student.id)!;
      let target = due;
      let instalments = 1;
      if (payerHabit === 'prompt') instalments = random.chance(0.6) ? 1 : 2;
      if (payerHabit === 'instalments') {
        instalments = random.int(2, 4);
        target = due - (random.chance(0.3) ? random.int(1, 8) * 25 : 0);
      }
      if (payerHabit === 'struggling') {
        instalments = random.int(1, 3);
        target = due * (random.int(35, 80) / 100);
      }
      if (payerHabit === 'defaulting') {
        instalments = random.chance(0.5) ? 1 : 0;
        target = random.int(4, 10) * 50;
      }

      const window = payerHabit === 'prompt' ? termDays.slice(0, 14) : termDays;
      let remaining = roundMoney(target);
      for (let i = 0; i < instalments; i++) {
        const day = window[Math.min(window.length - 1, Math.floor(((i + random.next() * 0.8) / instalments) * window.length))];
        if (remaining <= 0 || day > lastPaymentDay) break;
        const amount = i === instalments - 1 ? remaining : Math.min(remaining, roundToFifty(target / instalments + random.normal(0, 80)));
        remaining = roundMoney(remaining - amount);
        const payer = random.chance(0.85) ? guardianName : `${random.pick(random.chance(0.5) ? maleFirstNames : femaleFirstNames)} ${student.surname}`;
        data.payments.push(newPayment(student.id, termId, amount, day, payer, random));
      }
    }
  }

  const duplicate = data.payments.filter((p) => p.termId === CURRENT_TERM_ID && p.method === 'Cash')[12];
  if (duplicate) {
    data.payments.push({
      ...duplicate,
      voidedOn: addDays(duplicate.paidOn, 1),
      voidedBy: BURSAR_ID,
      voidReason: 'Duplicate entry. The same cash payment was recorded twice.',
    });
  }

  data.payments.sort((a, b) => a.paidOn.localeCompare(b.paidOn));
  const receiptSequence: Record<string, number> = { '2025': 213 };
  data.payments.forEach((payment, index) => {
    const year = payment.paidOn.slice(0, 4);
    receiptSequence[year] = (receiptSequence[year] ?? 0) + 1;
    payment.id = `PAY-${index + 1}`;
    payment.receiptNo = `RCT/${year}/${String(receiptSequence[year]).padStart(5, '0')}`;
  });
}

function newPayment(studentId: string, termId: string, amount: number, paidOn: string, paidBy: string, random: Random): FeePayment {
  const roll = random.next();
  const method: PaymentMethod = roll < 0.34 ? 'Cash' : roll < 0.8 ? 'Mobile Money' : roll < 0.97 ? 'Bank deposit' : 'Cheque';
  const reference =
    method === 'Mobile Money'
      ? `MoMo ${random.int(10000, 99999)}${random.int(100000, 999999)}`
      : method === 'Bank deposit'
        ? `${random.pick(['GCB', 'Ecobank', 'Fidelity', 'CalBank'])} slip ${String(random.int(100, 99999)).padStart(6, '0')}`
        : method === 'Cheque'
          ? `Chq ${random.int(100000, 999999)}`
          : null;
  return {
    id: '',
    schoolId: SEED_SCHOOL_ID,
    receiptNo: '',
    studentId,
    termId,
    amount: roundMoney(amount),
    method,
    reference,
    paidBy,
    paidOn,
    receivedBy: random.chance(0.7) ? BURSAR_ID : ACCOUNTS_CLERK_ID,
    voidedOn: null,
    voidedBy: null,
    voidReason: null,
  };
}
