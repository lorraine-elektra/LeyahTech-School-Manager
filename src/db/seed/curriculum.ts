import { SEED_SCHOOL_ID } from './dataset';
import type { Subject, Term } from '@/features/school/types';

type SubjectRow = [code: string, name: string, level: 'JHS' | 'SHS', core: boolean, programmes?: string[]];

// GES JHS (Common Core Programme) and SHS subjects used when a school is set up.
const subjectRows: SubjectRow[] = [
  ['jhs-eng', 'English Language', 'JHS', true],
  ['jhs-mat', 'Mathematics', 'JHS', true],
  ['jhs-sci', 'Integrated Science', 'JHS', true],
  ['jhs-soc', 'Social Studies', 'JHS', true],
  ['jhs-rme', 'Religious and Moral Education', 'JHS', false],
  ['jhs-cmp', 'Computing', 'JHS', false],
  ['jhs-ctc', 'Career Technology', 'JHS', false],
  ['jhs-cad', 'Creative Arts and Design', 'JHS', false],
  ['jhs-twi', 'Ghanaian Language (Asante Twi)', 'JHS', false],
  ['jhs-fre', 'French', 'JHS', false],
  ['shs-eng', 'English Language', 'SHS', true],
  ['shs-mat', 'Core Mathematics', 'SHS', true],
  ['shs-sci', 'Integrated Science', 'SHS', true],
  ['shs-soc', 'Social Studies', 'SHS', true],
  ['shs-phy', 'Physics', 'SHS', false, ['Science']],
  ['shs-che', 'Chemistry', 'SHS', false, ['Science']],
  ['shs-bio', 'Biology', 'SHS', false, ['Science']],
  ['shs-emt', 'Elective Mathematics', 'SHS', false, ['Science']],
  ['shs-lit', 'Literature-in-English', 'SHS', false, ['General Arts']],
  ['shs-gov', 'Government', 'SHS', false, ['General Arts']],
  ['shs-his', 'History', 'SHS', false, ['General Arts']],
  ['shs-eco', 'Economics', 'SHS', false, ['General Arts', 'Business']],
  ['shs-fac', 'Financial Accounting', 'SHS', false, ['Business']],
  ['shs-bmg', 'Business Management', 'SHS', false, ['Business']],
  ['shs-cac', 'Cost Accounting', 'SHS', false, ['Business']],
];

export function curriculumSubjects(): Subject[] {
  return subjectRows.map(([code, name, level, core, programmes], index) => ({
    id: code,
    schoolId: SEED_SCHOOL_ID,
    code,
    name,
    level,
    core,
    programmes: programmes ?? null,
    sortOrder: index + 1,
  }));
}

type TermRow = [code: string, academicYear: string, name: string, startsOn: string, endsOn: string];

const termRows: TermRow[] = [
  ['2025-26-T1', '2025/2026', '1st Term', '2025-09-09', '2025-12-19'],
  ['2025-26-T2', '2025/2026', '2nd Term', '2026-01-13', '2026-04-02'],
  ['2025-26-T3', '2025/2026', '3rd Term', '2026-04-21', '2026-07-24'],
  ['2026-27-T1', '2026/2027', '1st Term', '2026-09-08', '2026-12-18'],
  ['2026-27-T2', '2026/2027', '2nd Term', '2027-01-12', '2027-04-01'],
  ['2026-27-T3', '2026/2027', '3rd Term', '2027-04-20', '2027-07-23'],
];

export function calendarTerms(): Term[] {
  return termRows.map(([code, academicYear, name, startsOn, endsOn]) => ({
    id: code,
    schoolId: SEED_SCHOOL_ID,
    code,
    academicYear,
    name,
    startsOn,
    endsOn,
  }));
}
