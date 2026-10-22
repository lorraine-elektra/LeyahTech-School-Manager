import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_SCHOOL_SLUG } from '@/db/seed/demoAccounts';
import { LoginForm } from '@/features/auth/LoginForm';
import { findSchoolBySlug, optionalViewer } from '@/features/auth/session';
import { PRODUCT_NAME } from '@/features/shell/product';

export default async function LoginPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();
  if (await optionalViewer(slug)) redirect(`/${slug}`);
  const isDemo = slug === DEMO_SCHOOL_SLUG;

  return (
    <div className="login" style={{ ['--accent' as string]: school.accentColor }}>
      <aside className="login__aside">
        <div>
          <div className="school-mark__crest" aria-hidden="true">
            {school.shortName}
          </div>
          <h1>{school.name}</h1>
          <p className="login__aside-facts">
            {school.address}
            <br />
            {school.phone} · {school.email}
          </p>
        </div>
        <p className="login__aside-foot">{PRODUCT_NAME}</p>
      </aside>
      <main className="login__main">
        <div className="login__box">
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>Sign in</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Staff and parents use the username given by the school office.
          </p>
          <LoginForm schoolSlug={slug} demoAccounts={isDemo ? DEMO_ACCOUNTS : []} demoPassword={isDemo ? DEMO_PASSWORD : undefined} />
          <p className="muted" style={{ marginTop: 18 }}>
            Not your school? <Link href="/">Enter a different school code</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
