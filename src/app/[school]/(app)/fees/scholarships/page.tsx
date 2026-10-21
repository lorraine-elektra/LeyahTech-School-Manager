import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db/client';
import { scholarships, students } from '@/db/schema';
import { allow, canManageFees, canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { isScholarshipActive } from '@/features/fees/accounts';
import { addScholarship } from '@/features/fees/actions';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { ScholarshipForm } from '@/features/fees/ScholarshipForm';
import { termLabel } from '@/features/school/calendar';
import { admissionNoToSlug, studentRegisterName } from '@/features/students/names';
import { formatMoney } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { Tag } from '@/ui/Tag';

export default async function ScholarshipsPage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ added?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canViewFees(viewer) && isOfficeStaff(viewer));
  const rows = await db
    .select({ scholarship: scholarships, student: students })
    .from(scholarships)
    .innerJoin(students, eq(students.id, scholarships.studentId))
    .where(and(eq(scholarships.schoolId, viewer.school.id)));
  const accounts = await schoolFeeAccounts(viewer, viewer.currentTerm.id, [...new Set(rows.map((r) => r.student.id))]);
  const termName = (id: string | null) => (id ? termLabel(viewer.terms.find((t) => t.id === id)!) : 'Until stopped');

  return (
    <>
      <PageHeader title="Scholarships and discounts" meta={termLabel(viewer.currentTerm)} />
      {(await searchParams).added && <div className="notice notice--success" style={{ marginBottom: 12 }}>Scholarship added. It applies from the first term chosen.</div>}
      <div className="table-wrap">
        {rows.length === 0 ? (
          <p className="empty">No scholarships or discounts recorded.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Scholarship</th>
                <th>Basis</th>
                <th>From</th>
                <th>To</th>
                <th className="num">Off this term</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ scholarship, student }) => {
                const active = isScholarshipActive(scholarship, viewer.currentTerm, viewer.terms) && student.status === 'Active';
                const account = accounts.find((a) => a.student.id === student.id)?.account;
                const discount = account?.discounts.find((d) => d.name.startsWith(scholarship.name));
                return (
                  <tr key={scholarship.id}>
                    <td className="nowrap">
                      <Link href={`/${school}/students/${admissionNoToSlug(student.admissionNo)}/fees`}>{studentRegisterName(student)}</Link>
                    </td>
                    <td>{scholarship.name}</td>
                    <td className="nowrap">{scholarship.basis === 'percentOfTuition' ? `${scholarship.value}% of tuition` : `${formatMoney(scholarship.value)} per term`}</td>
                    <td className="nowrap">{termName(scholarship.fromTermId)}</td>
                    <td className="nowrap">{termName(scholarship.toTermId)}</td>
                    <td className="num">{active && discount ? formatMoney(discount.amount) : <Tag>Not active</Tag>}</td>
                    <td className="muted">{scholarship.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {canManageFees(viewer) && (
        <Section title="Add a scholarship or discount">
          <ScholarshipForm action={addScholarship.bind(null, school)} terms={viewer.terms} currentTermId={viewer.currentTerm.id} />
        </Section>
      )}
    </>
  );
}
