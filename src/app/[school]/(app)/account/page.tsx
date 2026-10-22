import { PasswordForm } from '@/features/auth/PasswordForm';
import { changePassword } from '@/features/auth/accountActions';
import { requireViewer } from '@/features/auth/session';
import { roleLabels } from '@/features/auth/types';
import { staffName } from '@/features/staff/names';
import { Avatar } from '@/ui/Avatar';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';

export default async function AccountPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  const name = viewer.staff ? staffName(viewer.staff) : `${viewer.guardian?.title} ${viewer.guardian?.name}`;

  return (
    <>
      <PageHeader title="My account" />
      <div className="profile-header" style={{ marginBottom: 8 }}>
        <Avatar name={name} size="large" />
        <div>
          <h2 style={{ fontSize: 17 }}>{name}</h2>
          <div className="muted">
            {roleLabels[viewer.role]} · Username <span className="mono">{viewer.username}</span>
          </div>
        </div>
      </div>
      {viewer.mustChangePassword && (
        <div className="notice notice--warn" style={{ marginTop: 16, maxWidth: 640 }}>
          You signed in with a temporary password. Choose your own password before you continue.
        </div>
      )}
      <Section title="Change password" icon="password">
        <PasswordForm action={changePassword.bind(null, school)} continueHref={`/${school}`} />
      </Section>
    </>
  );
}
