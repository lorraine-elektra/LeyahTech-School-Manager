# LeyahTech School Manager

Records, fees, attendance and reporting for Ghanaian basic and senior high schools. One installation serves many schools. Each school signs in at its own address, for example `/adom-heights`, and only sees its own data.

The product plan is in [docs/PLAN.md](docs/PLAN.md).

## What it does

| Area | Who uses it | What is in it |
| --- | --- | --- |
| Students | Headteacher, bursar, teachers (own classes) | Admission with numbered IDs (STU/2026/0143), guardian details, siblings sharing one parent account, transfers in and out, withdrawals. Students who leave stay on record. |
| Attendance | Class teacher | Daily register per class with present, late, excused and absent. Term register and attendance rate per student. |
| Score sheets | Subject teacher | Class score out of 30 and exam out of 100 (70%). BECE grades 1 to 9 for JHS, WASSCE A1 to F9 for SHS. |
| Report cards | Class teacher, headteacher, parent | Printable termly reports with subject and class positions, attendance, class teacher and headteacher remarks, and the next term date. |
| Promotion | Headteacher | End-of-year decisions from the annual average: promoted, promoted on trial, repeated or completed. Confirmed in the 3rd term. |
| Fees | Bursar, headteacher, parent | Fee schedule per level and programme, edited in place each term, part payments, arrears carried from term to term, numbered receipts (RCT/2026/00412), voided receipts kept on record, scholarships and discounts. Teachers do not see fees. |
| Staff and logins | Headteacher | Staff records with numbered IDs (STF/031), a login for each member with a temporary password that must be changed at first sign-in, password resets, disabling a login. |
| Classes and settings | Headteacher | Adding classes and streams, class teachers and rooms, the school profile and colour, and the current term. |
| Activity | Headteacher | A log of who admitted, marked, entered, recorded or changed what, filterable by area. |
| Exports | Headteacher, bursar | CSV files of students, fee accounts and receipts for Excel. |

## Running it locally

You need Node.js 20 or later and PostgreSQL 15 or later.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL to your database
npm run db:migrate            # creates the tables
npm run db:seed               # loads the demo school
npm run dev
```

Open http://localhost:3000 and enter the school code `adom-heights`.

### Demo accounts

All demo accounts use the password `demo2026`.

| Username | Name | Role |
| --- | --- | --- |
| cadjei | Mrs. Comfort Adjei | Headteacher |
| itetteh | Mr. Isaac Tetteh | Bursar |
| ymensah | Mr. Yaw Mensah | Class teacher, Basic 8A |
| eboateng | Ms. Efua Boateng | Subject teacher, Integrated Science |
| kagyeman | Mr. Kofi Agyeman | Parent |

The demo school, Adom Heights Academy, is fictional. Its data is generated from a fixed seed, so it is the same each time. It covers the 2025/2026 year in full and the 2026/2027 1st term up to today's date (between 21 October and 16 December 2026), so the number of payments varies a little with the day you seed: 282 students across Basic 7 to SHS 2, part payments and arrears, scholarships, repeats, transfers and withdrawals. Running `npm run db:seed` again replaces the demo school and leaves other schools alone.


## Running it for many users

- Lists of students, fee accounts, receipts and activity are paged in the database, 50 rows at a time.
- The tables that pages filter on are indexed by school, term and student.
- Failed sign-ins are stored in the database, so a lockout (5 tries, then 15 minutes) holds across several app servers.
- `GET /api/health` returns 200 when the app can reach the database, for uptime checks and load balancers.
- `DATABASE_POOL_MAX` sets the connections per app server (default 10). Set `DATABASE_POOLED=true` when connecting through a pooler such as PgBouncer or Neon's pooled address.

With the demo school copied up to 2,538 students and 13,000 payments, pages answered in 30 to 330 ms on a single server process.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests for grading, positions, the fee ledger, promotion, passwords, CSV export and class names |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | New migration after a schema change |
| `npm run db:migrate` | Apply migrations |

## Stack

- Next.js 15 (App Router, server actions) with TypeScript
- PostgreSQL with Drizzle ORM. Every table carries `school_id`.
- Tailwind CSS, IBM Plex Sans and IBM Plex Mono
- Sign-in with hashed passwords (scrypt) and server-side sessions

## Code layout

```
src/
  app/            routes only; pages load data and render feature components
  features/
    auth/         sign-in, sessions, role permissions
    students/     admission, records, exits
    attendance/   daily registers and totals
    assessment/   score sheets, grades, positions
    reports/      report cards and remarks
    promotion/    end-of-year decisions
    fees/         fee ledger, payments, receipts, scholarships
    overview/     the first page for each role
    staff/        staff records and logins
    classes/      adding classes, class teachers
    settings/     school profile, colour, current term
    activity/     the activity log
    school/       terms, classes, subjects, grading bands
  db/             schema, client, demo seed
  lib/            CSV export and page refresh helpers
  ui/             shared components and formatting
drizzle/          SQL migrations
```

## Not built yet

Mobile Money collection (Paystack or Hubtel), SMS to parents, timetable, staff payroll, and a sign-up flow for new schools. New schools are currently added directly in the database.
