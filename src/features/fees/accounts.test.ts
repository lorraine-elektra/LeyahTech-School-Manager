import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Term } from '@/features/school/types';
import { feeAccountHistory, feeStanding, summariseCollection, termFeeAccount, type FeeLedgerInput } from './accounts';
import type { FeeItem, FeePayment, Scholarship } from './types';

const terms: Term[] = [
  { id: 't1', schoolId: 's', code: '2025-26-T1', academicYear: '2025/2026', name: '1st Term', startsOn: '2025-09-09', endsOn: '2025-12-18' },
  { id: 't2', schoolId: 's', code: '2025-26-T2', academicYear: '2025/2026', name: '2nd Term', startsOn: '2026-01-13', endsOn: '2026-04-02' },
  { id: 't3', schoolId: 's', code: '2025-26-T3', academicYear: '2025/2026', name: '3rd Term', startsOn: '2026-04-28', endsOn: '2026-07-24' },
];

const feeItems = terms.flatMap((term) => [
  { id: `tu-${term.id}`, schoolId: 's', termId: term.id, level: 'JHS', programme: null, name: 'Tuition', amount: 1200, isTuition: true },
  { id: `pta-${term.id}`, schoolId: 's', termId: term.id, level: 'JHS', programme: null, name: 'PTA dues', amount: 85, isTuition: false },
]) as FeeItem[];

function payment(termId: string, amount: number, extra: Partial<FeePayment> = {}): FeePayment {
  return { id: `${termId}-${amount}`, schoolId: 's', receiptNo: 'RCT/2025/00001', studentId: 'st', termId, amount, method: 'Cash', reference: null, paidBy: 'Mrs. Ama Owusu', paidOn: '2025-10-01', receivedBy: null, voidedOn: null, voidedBy: null, voidReason: null, ...extra } as FeePayment;
}

function ledger(overrides: Partial<FeeLedgerInput> = {}): FeeLedgerInput {
  return {
    student: { id: 'st', admittedOn: '2025-09-09', exitedOn: null },
    terms,
    classes: [{ id: 'c8', level: 'JHS', programme: null }],
    enrolments: [{ academicYear: '2025/2026', classId: 'c8' }],
    feeItems,
    scholarships: [],
    payments: [],
    openingBalance: 0,
    ...overrides,
  };
}

test('unpaid balance is carried into the next term as arrears', () => {
  const history = feeAccountHistory(ledger({ payments: [payment('t1', 900), payment('t2', 1285)] }), 't2');
  assert.equal(history[0].balance, 385);
  assert.equal(history[1].arrearsBroughtForward, 385);
  assert.equal(history[1].balance, 385);
  assert.equal(feeStanding(history[1]), 'Part-paid');
});

test('opening balance from before the system counts as arrears in the first term', () => {
  const account = termFeeAccount(ledger({ openingBalance: 412.5 }), 't1')!;
  assert.equal(account.arrearsBroughtForward, 412.5);
  assert.equal(account.balance, 1697.5);
  assert.equal(feeStanding(account), 'Not paid');
});

test('a percentage scholarship applies to tuition only', () => {
  const scholarship = { id: 'sc', schoolId: 's', studentId: 'st', name: 'Staff child', basis: 'percentOfTuition', value: 50, fromTermId: 't2', toTermId: null } as Scholarship;
  const history = feeAccountHistory(ledger({ scholarships: [scholarship] }), 't3');
  assert.equal(history[0].discountTotal, 0);
  assert.equal(history[1].discountTotal, 600);
  assert.equal(history[2].balance, 1285 + 685 + 685);
});

test('a fixed discount never exceeds the term charges', () => {
  const scholarship = { id: 'sc', schoolId: 's', studentId: 'st', name: 'Bursary', basis: 'fixedPerTerm', value: 5000, fromTermId: 't1', toTermId: 't1' } as Scholarship;
  const [first, second] = feeAccountHistory(ledger({ scholarships: [scholarship] }), 't2');
  assert.equal(first.balance, 0);
  assert.equal(second.discountTotal, 0);
});

test('voided receipts do not reduce the balance', () => {
  const account = termFeeAccount(ledger({ payments: [payment('t1', 1285, { voidedOn: '2025-10-02' }), payment('t1', 500)] }), 't1')!;
  assert.equal(account.paid, 500);
  assert.equal(account.balance, 785);
});

test('overpayment leaves the account in credit', () => {
  const account = termFeeAccount(ledger({ payments: [payment('t1', 1400)] }), 't1')!;
  assert.equal(account.balance, -115);
  assert.equal(feeStanding(account), 'In credit');
});

test('a withdrawn student who still owes keeps a row with the old balance', () => {
  const student = { id: 'st', admittedOn: '2025-09-09', exitedOn: '2025-12-01' };
  const account = termFeeAccount(ledger({ student, payments: [payment('t1', 1000)] }), 't3')!;
  assert.equal(account.chargesTotal, 0);
  assert.equal(account.balance, 285);
  assert.equal(termFeeAccount(ledger({ student, payments: [payment('t1', 1285)] }), 't3'), undefined);
});

test('collection summary counts only positive balances as outstanding', () => {
  const owing = termFeeAccount(ledger({ payments: [payment('t1', 600)] }), 't1')!;
  const credit = termFeeAccount(ledger({ payments: [payment('t1', 1400)] }), 't1')!;
  const summary = summariseCollection([owing, credit]);
  assert.equal(summary.due, 2570);
  assert.equal(summary.collected, 2000);
  assert.equal(summary.outstanding, 685);
  assert.equal(summary.studentsOwing, 1);
});
