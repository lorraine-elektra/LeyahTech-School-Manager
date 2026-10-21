import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_SCHOOL_SLUG } from '@/db/seed/demoAccounts';
import { LoginForm } from '@/features/auth/LoginForm';
import { findSchoolBySlug, optionalViewer } from '@/features/auth/session';
import { PRODUCT_NAME } from '@/features/shell/product';
import { SchoolMark } from '@/features/shell/SchoolMark';

export default async function LoginPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();
  if (await optionalViewer(slug)) redirect(`/${slug}`);
  const isDemo = slug === DEMO_SCHOOL_SLUG;

  return (
    <div className="login" style={{ ['--accent' as string]: school.accentColor }}>
      <div className="login__box">
        <div style={{ paddingBottom: 16 }}>
          <SchoolMark school={school} subtitle="Staff and parent sign-in" />
        </div>
        <LoginForm schoolSlug={slug} demoAccounts={isDemo ? DEMO_ACCOUNTS : []} demoPassword={isDemo ? DEMO_PASSWORD : undefined} />
        <p className="muted" style={{ marginTop: 16 }}>
          Not your school? <Link href="/">Enter a different school code</Link>
        </p>
        <p className="faint" style={{ marginTop: 24 }}>
          {PRODUCT_NAME}
        </p>
      </div>
    </div>
  );
}
