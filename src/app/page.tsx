import { redirect } from 'next/navigation';
import { DEMO_SCHOOL_SLUG } from '@/db/seed/demoAccounts';
import { findSchoolBySlug } from '@/features/auth/session';
import { PRODUCT_NAME } from '@/features/shell/product';

async function openSchool(formData: FormData) {
  'use server';
  const code = String(formData.get('schoolCode') ?? '').trim().toLowerCase();
  const school = code ? await findSchoolBySlug(code) : undefined;
  redirect(school ? `/${school.slug}/login` : `/?notFound=${encodeURIComponent(code)}`);
}

export default async function FindSchoolPage({ searchParams }: { searchParams: Promise<{ notFound?: string }> }) {
  const { notFound } = await searchParams;
  return (
    <div className="login login--single">
      <main className="login__main">
        <div className="login__box">
          <div className="school-mark" style={{ marginBottom: 24 }}>
            <div className="school-mark__crest" aria-hidden="true">
              LT
            </div>
            <div className="school-mark__name">{PRODUCT_NAME}</div>
          </div>
          <h1 style={{ marginBottom: 6 }}>Sign in to your school</h1>
          <p className="muted" style={{ marginBottom: 16 }}>
            Enter the school code from your staff or parent letter.
          </p>
          <form action={openSchool} className="panel login__form">
            <label className="field">
              <span>School code</span>
              <input name="schoolCode" defaultValue={notFound} placeholder={DEMO_SCHOOL_SLUG} autoFocus />
            </label>
            {notFound !== undefined && (
              <div className="notice notice--error">
                No school uses the code &quot;{notFound}&quot;. Check the code on your staff or parent letter and try again.
              </div>
            )}
            <button className="button button--primary" type="submit">
              Continue
            </button>
          </form>
          <p className="muted" style={{ marginTop: 14 }}>
            Demo school code: <span className="mono">{DEMO_SCHOOL_SLUG}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
