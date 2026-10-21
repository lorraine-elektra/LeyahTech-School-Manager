import type { SchoolClass } from '@/features/school/types';
import type { Gender, Guardian, Student } from '@/features/students/types';
import type { Random } from '../random';
import { SEED_SCHOOL_ID, type SeedDataset } from './dataset';
import {
  femaleFirstNames,
  femaleMiddleNames,
  maleFirstNames,
  maleMiddleNames,
  occupations,
  phonePrefixes,
  previousJhsSchools,
  previousPrimarySchools,
  residences,
  surnames,
} from './names';

export type PayerHabit = 'prompt' | 'instalments' | 'struggling' | 'defaulting';

export interface StudentProfile {
  ability: number;
  subjectBias: Record<string, number>;
  absentRate: number;
  lateRate: number;
  excusedRate: number;
  payerHabit: PayerHabit;
}

export class StudentFactory {
  readonly profiles = new Map<string, StudentProfile>();
  private sequenceByYear: Record<number, number> = { 2023: 58, 2024: 41, 2025: 33, 2026: 47 };
  private guardianCount = 0;

  constructor(private data: SeedDataset, private random: Random) {}

  phoneNumber(): string {
    const { random } = this;
    return `${random.pick(phonePrefixes)} ${random.int(100, 999)} ${String(random.int(0, 9999)).padStart(4, '0')}`;
  }

  private nextAdmissionNo(year: number): string {
    this.sequenceByYear[year] = (this.sequenceByYear[year] ?? 20) + (this.random.chance(0.12) ? 2 : 1);
    return `STU/${year}/${String(this.sequenceByYear[year]).padStart(4, '0')}`;
  }

  addGuardian(guardian: Omit<Guardian, 'id' | 'schoolId'>): Guardian {
    this.guardianCount += 1;
    const created = { id: `GRD-${String(this.guardianCount).padStart(4, '0')}`, schoolId: SEED_SCHOOL_ID, ...guardian };
    this.data.guardians.push(created);
    return created;
  }

  private createGuardian(studentSurname: string): Guardian {
    const { random } = this;
    const roll = random.next();
    const relationship =
      roll < 0.45 ? 'Father' : roll < 0.83 ? 'Mother' : roll < 0.89 ? 'Aunt' : roll < 0.94 ? 'Uncle' : roll < 0.98 ? 'Grandmother' : 'Guardian';
    const isMale = relationship === 'Father' || relationship === 'Uncle' || (relationship === 'Guardian' && random.chance(0.5));
    const surname = relationship === 'Father' || random.chance(0.45) ? studentSurname : random.pick(surnames);
    const title = isMale ? 'Mr.' : relationship === 'Grandmother' ? 'Madam' : random.chance(0.7) ? 'Mrs.' : 'Ms.';
    const firstName = random.pick(isMale ? maleFirstNames : femaleFirstNames);
    return this.addGuardian({
      title,
      name: `${firstName} ${surname}`,
      relationship,
      phone: random.chance(0.07) ? null : this.phoneNumber(),
      altPhone: random.chance(0.3) ? this.phoneNumber() : null,
      occupation: random.pick(occupations),
      residence: random.pick(residences),
    });
  }

  createStudent(options: {
    schoolClass: SchoolClass;
    admittedOn: string;
    admissionType?: Student['admissionType'];
    firstName?: string;
    surname?: string;
    gender?: Gender;
    guardian?: Guardian;
    ability?: number;
  }): Student {
    const { random } = this;
    const gender = options.gender ?? (random.chance(0.5) ? 'M' : 'F');
    const guardian = options.guardian ?? this.siblingGuardian() ?? undefined;
    const surname = options.surname ?? (guardian ? guardian.name.split(' ').slice(-1)[0] : random.pick(surnames));
    const resolvedGuardian = guardian ?? this.createGuardian(surname);
    const admissionYear = Number(options.admittedOn.slice(0, 4));
    const admissionNo = this.nextAdmissionNo(admissionYear);
    const enteringYearGroup = options.schoolClass.yearGroup - (Number(options.schoolClass.academicYear.slice(0, 4)) - admissionYear);
    const birthYear = admissionYear - (enteringYearGroup + 5) - (random.chance(0.2) ? 1 : 0);
    const isShsEntry = enteringYearGroup >= 10;

    const student: Student = {
      id: admissionNo,
      schoolId: SEED_SCHOOL_ID,
      admissionNo,
      surname,
      firstName: options.firstName ?? random.pick(gender === 'M' ? maleFirstNames : femaleFirstNames),
      otherNames: random.chance(0.55) ? random.pick(gender === 'M' ? maleMiddleNames : femaleMiddleNames) : null,
      gender,
      dateOfBirth: `${birthYear}-${String(random.int(1, 12)).padStart(2, '0')}-${String(random.int(1, 28)).padStart(2, '0')}`,
      guardianId: resolvedGuardian.id,
      status: 'Active',
      admittedOn: options.admittedOn,
      admissionType: options.admissionType ?? 'New admission',
      previousSchool: random.pick(isShsEntry || enteringYearGroup > 7 ? previousJhsSchools : previousPrimarySchools),
      medicalNotes: random.chance(0.04)
        ? random.pick(['Asthmatic. Inhaler kept in school bag.', 'Sickle cell (SS). Avoid strenuous sport.', 'Allergic to groundnuts.', 'Wears glasses. Sits in front row.'])
        : null,
      exitedOn: null,
      exitReason: null,
    };
    this.data.students.push(student);

    const habitRoll = random.next();
    this.profiles.set(student.id, {
      ability: options.ability ?? Math.max(22, Math.min(93, random.normal(57, 13))),
      subjectBias: {},
      absentRate: random.pick([0.01, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.14, 0.2]),
      lateRate: random.int(1, 9) / 100,
      excusedRate: random.int(0, 3) / 100,
      payerHabit: habitRoll < 0.42 ? 'prompt' : habitRoll < 0.8 ? 'instalments' : habitRoll < 0.95 ? 'struggling' : 'defaulting',
    });
    return student;
  }

  private siblingGuardian(): Guardian | undefined {
    if (this.data.guardians.length < 10 || !this.random.chance(0.08)) return undefined;
    return this.random.pick(this.data.guardians);
  }

  subjectBias(studentId: string, subjectId: string): number {
    const profile = this.profiles.get(studentId)!;
    if (profile.subjectBias[subjectId] === undefined) profile.subjectBias[subjectId] = this.random.normal(0, 8);
    return profile.subjectBias[subjectId];
  }
}
