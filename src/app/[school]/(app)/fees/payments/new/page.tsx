import Link from 'next/link';
import { allow, canRecordPayments } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { recordPayment } from '@/features/fees/actions';
import { PaymentForm } from '@/features/fees/PaymentForm';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { termLabel, todayIso } from '@/features/school/calendar';
import { admissionNoToSlug, slugToAdmissionNo, studentFullName, studentRegisterName } from '@/features/students/names';
import { getStudentByAdmissionNo, listStudents } from '@/features/students/queries';
import { formatMoney, formatBalance } from '@/ui/format';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';

export default async function RecordPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ q?: string; student?: string }>;
}) {
  const { school } = await params;
  const { q, student: studentSlug } = await searchParams;
  const viewer = await requireViewer(school);
  allow(canRecordPayments(viewer));
  const selected = studentSlug ? await getStudentByAdmissionNo(viewer.school.id, slugToAdmissionNo(studentSlug)) : undefined;

  if (!selected) {
    const query = q?.trim().toLowerCase();
    const matches = query
      ? (await listStudents(viewer.school.id, viewer.currentTerm.academicYear))
          .filter(({ student, guardian }) =>
            [studentFullName(student), student.admissionNo, guardian?.name ?? ''].some((v) => v.toLowerCase().includes(query)) ||
            (!!guardian?.phone && guardian.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))),
          )
          .slice(0, 30)
      : [];
    return (
      <>
        <PageHeader title="Record payment" meta={termLabel(viewer.currentTerm)} />
        <form method="get" className="table-toolbar">
          <label className="field">
            <span>Find student</span>
            <input name="q" defaultValue={q} placeholder="Name, admission no., parent name or phone" style={{ width: 340 }} autoFocus />
          </label>
          <button className="button button--primary" type="submit">
            Search
          </button>
        </form>
        {query && (
          <div className="table-wrap">
            {matches.length === 0 ? (
              <p className="empty">No student matches &quot;{q}&quot;. Try the admission number, for example STU/2026/0143.</p>
            ) : (
              <table className="table">
                <tbody>
                  {matches.map(({ student, schoolClass, guardian }) => (
                    <tr key={student.id}>
                      <td className="mono">{student.admissionNo}</td>
                      <td>{studentRegisterName(student)}</td>
                      <td>{schoolClass?.name}</td>
                      <td className="muted">{guardian ? `${guardian.title} ${guardian.name}` : ''}</td>
                      <td>{student.status !== 'Active' && student.status}</td>
                      <td>
                        <Link href={`?student=${admissionNoToSlug(student.admissionNo)}`}>Select</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </>
    );
  }

  const { student, guardian } = selected;
  const [account] = await schoolFeeAccounts(viewer, viewer.currentTerm.id, [student.id]);

  return (
    <>
      <PageHeader
        title="Record payment"
        meta={`${termLabel(viewer.currentTerm)} · ${studentFullName(student)}, ${student.admissionNo}`}
        breadcrumb={<Link href="?">Choose a different student</Link>}
      />
      <div className="two-col">
        <PaymentForm
          action={recordPayment.bind(null, school, student.id)}
          defaultPayer={guardian ? `${guardian.title} ${guardian.name}` : ''}
          today={todayIso()}
        />
        <Section title="Account this term">
          {account ? (
            <dl className="panel detail-grid">
              <div>
                <dt>Class</dt>
                <dd>{account.schoolClass?.name}</dd>
              </div>
              <div>
                <dt>Arrears brought forward</dt>
                <dd className="mono">{formatMoney(account.account.arrearsBroughtForward)}</dd>
              </div>
              <div>
                <dt>Term fees less scholarship</dt>
                <dd className="mono">{formatMoney(account.account.chargesTotal - account.account.discountTotal)}</dd>
              </div>
              <div>
                <dt>Paid so far</dt>
                <dd className="mono">{formatMoney(account.account.paid)}</dd>
              </div>
              <div>
                <dt>Balance before this payment</dt>
                <dd className={account.account.balance > 0 ? 'mono bad' : 'mono'}>{formatBalance(account.account.balance)}</dd>
              </div>
            </dl>
          ) : (
            <p className="panel empty">No fees billed to this student this term.</p>
          )}
        </Section>
      </div>
    </>
  );
}
