import { termsUpTo } from '@/features/school/calendar';
import type { SchoolClass, Term } from '@/features/school/types';
import type { Enrolment, Student } from '@/features/students/types';
import type { FeeItem, FeePayment, Scholarship } from './types';

export interface FeeLine {
  name: string;
  amount: number;
}

export interface TermFeeAccount {
  termId: string;
  classId?: string;
  charges: FeeLine[];
  chargesTotal: number;
  discounts: FeeLine[];
  discountTotal: number;
  arrearsBroughtForward: number;
  payments: FeePayment[];
  paid: number;
  balance: number;
}

export interface FeeLedgerInput {
  student: Pick<Student, 'id' | 'admittedOn' | 'exitedOn'>;
  terms: Term[];
  classes: Pick<SchoolClass, 'id' | 'level' | 'programme'>[];
  enrolments: Pick<Enrolment, 'academicYear' | 'classId'>[];
  feeItems: FeeItem[];
  scholarships: Scholarship[];
  payments: FeePayment[];
  openingBalance: number;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function sumMoney<T>(rows: T[], amount: (row: T) => number): number {
  return roundMoney(rows.reduce((sum, row) => sum + amount(row), 0));
}

export function chargesFor(feeItems: FeeItem[], schoolClass: Pick<SchoolClass, 'level' | 'programme'>, termId: string): FeeItem[] {
  return feeItems.filter(
    (item) => item.termId === termId && item.level === schoolClass.level && (!item.programme || item.programme === schoolClass.programme),
  );
}

export function isScholarshipActive(scholarship: Scholarship, term: Term, terms: Term[]): boolean {
  const from = terms.find((t) => t.id === scholarship.fromTermId);
  const to = scholarship.toTermId ? terms.find((t) => t.id === scholarship.toTermId) : undefined;
  if (!from || term.startsOn < from.startsOn) return false;
  return !scholarship.toTermId || (!!to && term.startsOn <= to.startsOn);
}

export function scholarshipLabel(scholarship: Pick<Scholarship, 'name' | 'basis' | 'value'>): string {
  return scholarship.basis === 'percentOfTuition' ? `${scholarship.name} (${scholarship.value}% of tuition)` : scholarship.name;
}

export function feeAccountHistory(input: FeeLedgerInput, uptoTermId: string): TermFeeAccount[] {
  const { student, terms } = input;
  let arrears = input.openingBalance;
  const history: TermFeeAccount[] = [];

  for (const term of termsUpTo(terms, uptoTermId)) {
    const enrolment = input.enrolments.find((e) => e.academicYear === term.academicYear);
    const schoolClass = enrolment && input.classes.find((c) => c.id === enrolment.classId);
    const billed =
      !!schoolClass && student.admittedOn <= term.endsOn && (!student.exitedOn || student.exitedOn > term.startsOn);
    const payments = input.payments.filter((p) => p.termId === term.id && !p.voidedOn);
    if (!billed && payments.length === 0) continue;

    const items = billed ? chargesFor(input.feeItems, schoolClass, term.id) : [];
    const charges = items.map((item) => ({ name: item.name, amount: item.amount }));
    const chargesTotal = sumMoney(charges, (line) => line.amount);
    const tuition = sumMoney(items.filter((item) => item.isTuition), (item) => item.amount);
    const discounts = billed
      ? input.scholarships
          .filter((s) => isScholarshipActive(s, term, terms))
          .map((s) => ({
            name: scholarshipLabel(s),
            amount: roundMoney(s.basis === 'percentOfTuition' ? (tuition * s.value) / 100 : Math.min(s.value, chargesTotal)),
          }))
      : [];
    const discountTotal = sumMoney(discounts, (line) => line.amount);
    const paid = sumMoney(payments, (p) => p.amount);
    const balance = roundMoney(arrears + chargesTotal - discountTotal - paid);

    history.push({
      termId: term.id,
      classId: schoolClass?.id,
      charges,
      chargesTotal,
      discounts,
      discountTotal,
      arrearsBroughtForward: arrears,
      payments,
      paid,
      balance,
    });
    arrears = balance;
  }
  return history;
}

// The account for one term. A former student who still owes gets a row carrying the old balance.
export function termFeeAccount(input: FeeLedgerInput, termId: string): TermFeeAccount | undefined {
  const history = feeAccountHistory(input, termId);
  const last = history[history.length - 1];
  if (!last) return undefined;
  if (last.termId === termId) return last;
  if (last.balance === 0) return undefined;
  return {
    termId,
    charges: [],
    chargesTotal: 0,
    discounts: [],
    discountTotal: 0,
    arrearsBroughtForward: last.balance,
    payments: [],
    paid: 0,
    balance: last.balance,
  };
}

export type FeeStanding = 'Paid' | 'Part-paid' | 'Not paid' | 'In credit';

export function feeStanding(account: TermFeeAccount): FeeStanding {
  if (account.balance < 0) return 'In credit';
  if (account.balance === 0) return 'Paid';
  return account.paid > 0 ? 'Part-paid' : 'Not paid';
}

export interface TermCollection {
  billed: number;
  discounts: number;
  arrearsBroughtForward: number;
  due: number;
  collected: number;
  outstanding: number;
  studentsOwing: number;
}

export function summariseCollection(accounts: TermFeeAccount[]): TermCollection {
  const billed = sumMoney(accounts, (a) => a.chargesTotal);
  const discounts = sumMoney(accounts, (a) => a.discountTotal);
  const arrearsBroughtForward = sumMoney(accounts, (a) => a.arrearsBroughtForward);
  return {
    billed,
    discounts,
    arrearsBroughtForward,
    due: roundMoney(billed - discounts + arrearsBroughtForward),
    collected: sumMoney(accounts, (a) => a.paid),
    outstanding: sumMoney(accounts, (a) => Math.max(0, a.balance)),
    studentsOwing: accounts.filter((a) => a.balance > 0).length,
  };
}
