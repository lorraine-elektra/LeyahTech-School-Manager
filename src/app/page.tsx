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
    <div className="login">
      <div className="login__box">
        <p className="muted" style={{ marginBottom: 4 }}>
          {PRODUCT_NAME}
        </p>
        <h1 style={{ marginBottom: 12 }}>Sign in to your school</h1>
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
        <p className="muted" style={{ marginTop: 12 }}>
          Demo school code: <span className="mono">{DEMO_SCHOOL_SLUG}</span>
        </p>
      </div>
    </div>
  );
}
