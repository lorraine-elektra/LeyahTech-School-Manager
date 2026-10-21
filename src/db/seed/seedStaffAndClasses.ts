import { subjectsFor } from '@/features/school/subjects';
import type { SchoolClass, Subject, TeachingAssignment } from '@/features/school/types';
import type { StaffMember, StaffPosition } from '@/features/staff/types';
import { SEED_SCHOOL_ID, type SeedAccount } from './dataset';

type StaffRow = [string, string, string, string, StaffPosition, string, string, string];

const staffRows: StaffRow[] = [
  ['STF/003', 'Mrs.', 'Comfort', 'Adjei', 'Headteacher', 'M.Ed. Educational Administration', '2011-09-05', '024 412 6630'],
  ['STF/007', 'Mr.', 'Samuel', 'Ofori-Atta', 'Assistant Headteacher', 'B.Ed. Mathematics', '2013-01-14', '020 816 2274'],
  ['STF/011', 'Mr.', 'Isaac', 'Tetteh', 'Bursar', 'HND Accountancy, ICAG Level 2', '2014-08-18', '054 330 9182'],
  ['STF/024', 'Ms.', 'Mavis', 'Kpodo', 'Accounts Clerk', 'Diploma in Accounting', '2020-02-03', '055 902 4417'],
  ['STF/009', 'Madam', 'Gifty', 'Lartey', 'Teacher', 'B.Ed. Religious Studies', '2012-09-10', '024 655 1038'],
  ['STF/012', 'Mrs.', 'Akosua', 'Frimpong', 'Teacher', 'B.A. English, PGDE', '2014-09-08', '027 441 8865'],
  ['STF/015', 'Mr.', 'Yaw', 'Mensah', 'Teacher', 'B.Ed. Mathematics', '2015-09-07', '024 381 7742'],
  ['STF/017', 'Ms.', 'Adwoa', 'Sarpong', 'Teacher', 'B.Ed. Ghanaian Language (Akan)', '2016-01-11', '059 213 0067'],
  ['STF/019', 'Ms.', 'Efua', 'Boateng', 'Teacher', 'B.Sc. Biological Science, PGDE', '2016-09-12', '050 774 2931'],
  ['STF/021', 'Mr.', 'Kwabena', 'Owusu', 'Teacher', 'B.Ed. Social Studies', '2017-09-11', '024 908 3315'],
  ['STF/026', 'Mrs.', 'Abena', 'Darko', 'Teacher', 'B.A. Art Education', '2018-09-10', '026 330 5871'],
  ['STF/028', 'Mr.', 'Emmanuel', 'Quaye', 'Teacher', 'B.Sc. Information Technology', '2019-01-14', '055 617 2209'],
  ['STF/031', 'Mr.', 'Daniel', 'Agbeko', 'Teacher', 'B.A. French', '2019-09-09', '024 270 9946'],
  ['STF/033', 'Mr.', 'Fuseini', 'Alhassan', 'Teacher', 'Diploma in Basic Education', '2021-09-13', '054 118 6502'],
  ['STF/035', 'Mr.', 'Kofi', 'Antwi', 'Teacher', 'B.Sc. Physics, PGDE', '2025-08-25', '020 553 7810'],
  ['STF/036', 'Mr.', 'Bernard', 'Asamoah', 'Teacher', 'M.Phil. Mathematics', '2025-08-25', '024 773 1164'],
  ['STF/037', 'Mrs.', 'Patience', 'Opoku', 'Teacher', 'B.Com. Accounting, PGDE', '2025-08-25', '057 806 4429'],
  ['STF/038', 'Mrs.', 'Esi', 'Arthur', 'Teacher', 'B.Sc. Chemistry, PGDE', '2025-08-25', '024 196 0583'],
  ['STF/039', 'Mr.', 'Prince', 'Gyamfi', 'Teacher', 'B.Sc. Biology Education', '2025-09-01', '055 461 3397'],
  ['STF/040', 'Ms.', 'Linda', 'Ansah', 'Teacher', 'B.A. English and Linguistics', '2026-08-24', '020 991 2756'],
  ['STF/041', 'Mr.', 'Richard', 'Nyarko', 'Teacher', 'B.A. Economics', '2026-08-24', '024 568 2081'],
  ['STF/043', 'Mr.', 'Joseph', 'Eshun', 'Teacher', 'B.A. History and Literature', '2026-08-24', '054 702 5513'],
  ['STF/044', 'Mr.', 'Ibrahim', 'Seidu', 'Teacher', 'B.Com. Management, PGDE', '2026-08-24', '027 615 8840'],
];

export function seedStaff(): StaffMember[] {
  return staffRows.map(([staffNo, title, firstName, surname, position, qualification, joinedOn, phone]) => ({
    id: staffNo,
    schoolId: SEED_SCHOOL_ID,
    staffNo,
    title,
    firstName,
    surname,
    position,
    qualification,
    joinedOn,
    phone,
  }));
}

export const DEMO_PASSWORD = 'demo2026';

export function seedStaffAccounts(staff: StaffMember[]): SeedAccount[] {
  return staff.map((member) => ({
    username: `${member.firstName[0]}${member.surname}`.toLowerCase().replace(/[^a-z]/g, ''),
    password: DEMO_PASSWORD,
    staffId: member.id,
    guardianId: null,
  }));
}

type ClassRow = [key: string, name: string, yearGroup: number, stream: string | undefined, programme: string | undefined, classTeacherId: string, room: string];

const classes2025: ClassRow[] = [
  ['b7a', 'Basic 7A', 7, 'A', undefined, 'STF/012', 'JHS Block, Room 1'],
  ['b7b', 'Basic 7B', 7, 'B', undefined, 'STF/021', 'JHS Block, Room 2'],
  ['b8a', 'Basic 8A', 8, 'A', undefined, 'STF/015', 'JHS Block, Room 3'],
  ['b8b', 'Basic 8B', 8, 'B', undefined, 'STF/028', 'JHS Block, Room 4'],
  ['b9a', 'Basic 9A', 9, 'A', undefined, 'STF/009', 'JHS Block, Room 5'],
  ['b9b', 'Basic 9B', 9, 'B', undefined, 'STF/031', 'JHS Block, Room 6'],
  ['s1sci', 'SHS 1 Science', 10, undefined, 'Science', 'STF/038', 'SHS Block, Room 2'],
  ['s1bus', 'SHS 1 Business', 10, undefined, 'Business', 'STF/037', 'SHS Block, Room 3'],
];

const classes2026: ClassRow[] = [
  ['b7a', 'Basic 7A', 7, 'A', undefined, 'STF/012', 'JHS Block, Room 1'],
  ['b7b', 'Basic 7B', 7, 'B', undefined, 'STF/021', 'JHS Block, Room 2'],
  ['b8a', 'Basic 8A', 8, 'A', undefined, 'STF/015', 'JHS Block, Room 3'],
  ['b8b', 'Basic 8B', 8, 'B', undefined, 'STF/028', 'JHS Block, Room 4'],
  ['b9a', 'Basic 9A', 9, 'A', undefined, 'STF/009', 'JHS Block, Room 5'],
  ['b9b', 'Basic 9B', 9, 'B', undefined, 'STF/031', 'JHS Block, Room 6'],
  ['s1sci', 'SHS 1 Science', 10, undefined, 'Science', 'STF/035', 'SHS Block, Room 1'],
  ['s1art', 'SHS 1 General Arts', 10, undefined, 'General Arts', 'STF/040', 'SHS Block, Room 4'],
  ['s2sci', 'SHS 2 Science', 11, undefined, 'Science', 'STF/038', 'SHS Block, Room 2'],
  ['s2bus', 'SHS 2 Business', 11, undefined, 'Business', 'STF/037', 'SHS Block, Room 3'],
];

function buildClasses(academicYear: string, rows: ClassRow[]): SchoolClass[] {
  const yearKey = academicYear.slice(2, 4) + academicYear.slice(7, 9);
  return rows.map(([key, name, yearGroup, stream, programme, classTeacherId, room]) => ({
    id: `${yearKey}-${key}`,
    schoolId: SEED_SCHOOL_ID,
    academicYear,
    name,
    level: yearGroup <= 9 ? 'JHS' : 'SHS',
    yearGroup,
    stream: stream ?? null,
    programme: programme ?? null,
    classTeacherId,
    room,
  }));
}

export function seedClasses(): SchoolClass[] {
  return [...buildClasses('2025/2026', classes2025), ...buildClasses('2026/2027', classes2026)];
}

const subjectTeachers: Record<string, string> = {
  'jhs-eng': 'STF/012',
  'jhs-mat': 'STF/015',
  'jhs-sci': 'STF/019',
  'jhs-soc': 'STF/021',
  'jhs-rme': 'STF/009',
  'jhs-cmp': 'STF/028',
  'jhs-ctc': 'STF/033',
  'jhs-cad': 'STF/026',
  'jhs-twi': 'STF/017',
  'jhs-fre': 'STF/031',
  'shs-eng': 'STF/040',
  'shs-mat': 'STF/036',
  'shs-sci': 'STF/039',
  'shs-soc': 'STF/044',
  'shs-phy': 'STF/035',
  'shs-che': 'STF/038',
  'shs-bio': 'STF/039',
  'shs-emt': 'STF/036',
  'shs-lit': 'STF/043',
  'shs-gov': 'STF/041',
  'shs-his': 'STF/043',
  'shs-eco': 'STF/041',
  'shs-fac': 'STF/037',
  'shs-bmg': 'STF/044',
  'shs-cac': 'STF/037',
};

// Before the 2026 SHS hires, these subjects were covered by existing staff.
const subjectTeachers2025: Record<string, string> = {
  'shs-eng': 'STF/012',
  'shs-soc': 'STF/021',
  'shs-eco': 'STF/037',
  'shs-bmg': 'STF/037',
};

export function seedTeachingAssignments(classes: SchoolClass[], subjects: Subject[]): TeachingAssignment[] {
  return classes.flatMap((schoolClass) =>
    subjectsFor(subjects, schoolClass.level, schoolClass.programme).map((subject) => ({
      schoolId: SEED_SCHOOL_ID,
      classId: schoolClass.id,
      subjectId: subject.id,
      teacherId:
        (schoolClass.academicYear === '2025/2026' && subjectTeachers2025[subject.code]) || subjectTeachers[subject.code],
    })),
  );
}
