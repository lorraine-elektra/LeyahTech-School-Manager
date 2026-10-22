import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '@/features/auth/actions';
import { requireViewer } from '@/features/auth/session';
import { roleLabels } from '@/features/auth/types';
import { termLabel } from '@/features/school/calendar';
import { SchoolMark } from '@/features/shell/SchoolMark';
import { SideNav } from '@/features/shell/SideNav';
import { navigationFor } from '@/features/shell/navigation';
import { PRODUCT_NAME } from '@/features/shell/product';
import { staffName } from '@/features/staff/names';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';

export default async function SchoolLayout({ children, params }: { children: ReactNode; params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const viewer = await requireViewer(slug);
  if (viewer.mustChangePassword && !(await headers()).get('x-pathname')?.endsWith('/account')) redirect(`/${slug}/account?first=1`);
  const displayName = viewer.staff ? staffName(viewer.staff) : `${viewer.guardian?.title} ${viewer.guardian?.name}`;
  const canSearch = viewer.role !== 'parent';

  return (
    <div className="shell" style={{ ['--accent' as string]: viewer.school.accentColor }}>
      <aside className="sidebar">
        <SchoolMark school={viewer.school} subtitle={termLabel(viewer.currentTerm)} />
        <SideNav basePath={`/${slug}`} groups={navigationFor(viewer.role, viewer.ownClassId)} />
        <div className="sidebar__footer">{PRODUCT_NAME}</div>
      </aside>
      <div className="main">
        <header className="topbar">
          {canSearch ? (
            <form className="topbar__search" action={`/${slug}/students`} role="search">
              <Icon name="search" />
              <input name="q" placeholder="Find a student by name or admission no." aria-label="Find a student" />
            </form>
          ) : (
            <span className="muted">{viewer.school.address}</span>
          )}
          <div className="topbar__user">
            <Link href={`/${slug}/account`} className="user-chip" title="My account">
              <Avatar name={displayName} />
              <span className="user-chip__text">
                <span className="user-chip__name">{displayName}</span>
                <br />
                <span className="user-chip__role">{roleLabels[viewer.role]}</span>
              </span>
            </Link>
            <form action={signOut.bind(null, slug)}>
              <button className="button button--small button--ghost" type="submit" title="Sign out">
                <Icon name="signOut" size={15} /> Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
