import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: 'number' });
const isoDate = (name: string) => date(name, { mode: 'string' });

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  accentColor: text('accent_color').notNull(),
  currentTermId: uuid('current_term_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const terms = pgTable(
  'terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    code: text('code').notNull(),
    academicYear: text('academic_year').notNull(),
    name: text('name').notNull(),
    startsOn: isoDate('starts_on').notNull(),
    endsOn: isoDate('ends_on').notNull(),
  },
  (t) => [unique().on(t.schoolId, t.code)],
);

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    staffNo: text('staff_no').notNull(),
    title: text('title').notNull(),
    firstName: text('first_name').notNull(),
    surname: text('surname').notNull(),
    position: text('position').notNull(),
    phone: text('phone'),
    qualification: text('qualification'),
    joinedOn: isoDate('joined_on'),
  },
  (t) => [unique().on(t.schoolId, t.staffNo)],
);

export const guardians = pgTable(
  'guardians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    title: text('title').notNull(),
    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    phone: text('phone'),
    altPhone: text('alt_phone'),
    occupation: text('occupation'),
    residence: text('residence'),
  },
  (t) => [index().on(t.schoolId)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    staffId: uuid('staff_id').references(() => staff.id),
    guardianId: uuid('guardian_id').references(() => guardians.id),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
  },
  (t) => [unique().on(t.schoolId, t.username), index().on(t.guardianId), index().on(t.staffId)],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index().on(t.userId), index().on(t.expiresAt)],
);

// Failed sign-ins are counted here so lockouts hold across every server instance.
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    ipAddress: text('ip_address'),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.schoolId, t.username, t.attemptedAt), index().on(t.attemptedAt)],
);

export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: text('actor_name').notNull(),
    area: text('area').$type<'Students' | 'Attendance' | 'Scores' | 'Reports' | 'Fees' | 'Promotion' | 'Settings' | 'Staff'>().notNull(),
    action: text('action').notNull(),
    link: text('link'),
  },
  (t) => [index().on(t.schoolId, t.at), index().on(t.schoolId, t.area, t.at)],
);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    level: text('level').$type<'JHS' | 'SHS'>().notNull(),
    core: boolean('core').notNull(),
    programmes: text('programmes').array(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [unique().on(t.schoolId, t.code)],
);

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    academicYear: text('academic_year').notNull(),
    name: text('name').notNull(),
    level: text('level').$type<'JHS' | 'SHS'>().notNull(),
    yearGroup: integer('year_group').notNull(),
    stream: text('stream'),
    programme: text('programme'),
    classTeacherId: uuid('class_teacher_id').references(() => staff.id),
    room: text('room'),
  },
  (t) => [unique().on(t.schoolId, t.academicYear, t.name)],
);

export const teachingAssignments = pgTable(
  'teaching_assignments',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    classId: uuid('class_id').notNull().references(() => classes.id),
    subjectId: uuid('subject_id').notNull().references(() => subjects.id),
    teacherId: uuid('teacher_id').notNull().references(() => staff.id),
  },
  (t) => [primaryKey({ columns: [t.classId, t.subjectId] })],
);

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    admissionNo: text('admission_no').notNull(),
    surname: text('surname').notNull(),
    firstName: text('first_name').notNull(),
    otherNames: text('other_names'),
    gender: text('gender').$type<'M' | 'F'>().notNull(),
    dateOfBirth: isoDate('date_of_birth').notNull(),
    guardianId: uuid('guardian_id').references(() => guardians.id),
    status: text('status').$type<'Active' | 'Withdrawn' | 'Transferred out' | 'Completed'>().notNull(),
    admittedOn: isoDate('admitted_on').notNull(),
    admissionType: text('admission_type').$type<'New admission' | 'Transfer in'>().notNull(),
    previousSchool: text('previous_school'),
    medicalNotes: text('medical_notes'),
    exitedOn: isoDate('exited_on'),
    exitReason: text('exit_reason'),
  },
  (t) => [unique().on(t.schoolId, t.admissionNo), index().on(t.schoolId, t.status), index().on(t.guardianId)],
);

export const enrolments = pgTable(
  'enrolments',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    academicYear: text('academic_year').notNull(),
    classId: uuid('class_id').notNull().references(() => classes.id),
    outcome: text('outcome').$type<
      'Promoted' | 'Promoted on trial' | 'Repeated' | 'Completed' | 'Withdrawn' | 'Transferred out'
    >(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.academicYear] }), index().on(t.classId), index().on(t.schoolId, t.academicYear)],
);

export const studentMovements = pgTable(
  'student_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    kind: text('kind').$type<'Admission' | 'Transfer in' | 'Transfer out' | 'Withdrawal' | 'Repeat'>().notNull(),
    date: isoDate('date').notNull(),
    details: text('details').notNull(),
    recordedBy: uuid('recorded_by').references(() => staff.id),
  },
  (t) => [index().on(t.schoolId, t.date)],
);

export const attendanceSheets = pgTable(
  'attendance_sheets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    classId: uuid('class_id').notNull().references(() => classes.id),
    date: isoDate('date').notNull(),
    markedBy: uuid('marked_by').references(() => staff.id),
    markedAt: timestamp('marked_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (t) => [unique().on(t.classId, t.date), index().on(t.schoolId, t.date)],
);

export const attendanceEntries = pgTable(
  'attendance_entries',
  {
    sheetId: uuid('sheet_id').notNull().references(() => attendanceSheets.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id').notNull().references(() => students.id),
    status: text('status').$type<'present' | 'late' | 'excused' | 'absent'>().notNull(),
    note: text('note'),
  },
  (t) => [primaryKey({ columns: [t.sheetId, t.studentId] }), index().on(t.studentId)],
);

// Closed terms keep per-student totals; daily entries are needed only while a term is open.
export const attendanceSummaries = pgTable(
  'attendance_summaries',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    termId: uuid('term_id').notNull().references(() => terms.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    daysOpen: integer('days_open').notNull(),
    present: integer('present').notNull(),
    late: integer('late').notNull(),
    excused: integer('excused').notNull(),
    absent: integer('absent').notNull(),
  },
  (t) => [primaryKey({ columns: [t.termId, t.studentId] })],
);

export const subjectScores = pgTable(
  'subject_scores',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    termId: uuid('term_id').notNull().references(() => terms.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    subjectId: uuid('subject_id').notNull().references(() => subjects.id),
    classScore: doublePrecision('class_score'),
    examScore: doublePrecision('exam_score'),
    updatedBy: uuid('updated_by').references(() => staff.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.termId, t.studentId, t.subjectId] }), index().on(t.schoolId, t.termId, t.subjectId)],
);

export const reportRemarks = pgTable(
  'report_remarks',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    termId: uuid('term_id').notNull().references(() => terms.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    conduct: text('conduct'),
    interest: text('interest'),
    classTeacherRemark: text('class_teacher_remark'),
    headteacherRemark: text('headteacher_remark'),
  },
  (t) => [primaryKey({ columns: [t.termId, t.studentId] })],
);

export const feeItems = pgTable(
  'fee_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    termId: uuid('term_id').notNull().references(() => terms.id),
    level: text('level').$type<'JHS' | 'SHS'>().notNull(),
    programme: text('programme'),
    name: text('name').notNull(),
    amount: money('amount').notNull(),
    isTuition: boolean('is_tuition').notNull(),
  },
  (t) => [index().on(t.schoolId, t.termId)],
);

export const scholarships = pgTable(
  'scholarships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    name: text('name').notNull(),
    basis: text('basis').$type<'percentOfTuition' | 'fixedPerTerm'>().notNull(),
    value: money('value').notNull(),
    fromTermId: uuid('from_term_id').notNull().references(() => terms.id),
    toTermId: uuid('to_term_id').references(() => terms.id),
    approvedBy: uuid('approved_by').references(() => staff.id),
    notes: text('notes'),
  },
  (t) => [index().on(t.schoolId), index().on(t.studentId)],
);

export const feePayments = pgTable(
  'fee_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    receiptNo: text('receipt_no').notNull(),
    studentId: uuid('student_id').notNull().references(() => students.id),
    termId: uuid('term_id').notNull().references(() => terms.id),
    amount: money('amount').notNull(),
    method: text('method').$type<'Cash' | 'Mobile Money' | 'Bank deposit' | 'Cheque'>().notNull(),
    reference: text('reference'),
    paidBy: text('paid_by').notNull(),
    paidOn: isoDate('paid_on').notNull(),
    receivedBy: uuid('received_by').references(() => staff.id),
    voidedOn: isoDate('voided_on'),
    voidedBy: uuid('voided_by').references(() => staff.id),
    voidReason: text('void_reason'),
  },
  (t) => [unique().on(t.schoolId, t.receiptNo), index().on(t.studentId), index().on(t.schoolId, t.paidOn), index().on(t.schoolId, t.termId)],
);

// Balances owed before a school's records moved into the system.
export const openingBalances = pgTable('opening_balances', {
  studentId: uuid('student_id').primaryKey().references(() => students.id),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  amount: money('amount').notNull(),
  note: text('note').notNull(),
});

export const receiptCounters = pgTable(
  'receipt_counters',
  {
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    year: integer('year').notNull(),
    lastNumber: integer('last_number').notNull(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.year] })],
);
