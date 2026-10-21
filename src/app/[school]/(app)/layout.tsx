import type { ReactNode } from 'react';
import { signOut } from '@/features/auth/actions';
import { requireViewer } from '@/features/auth/session';
import { roleLabels } from '@/features/auth/types';
import { termLabel } from '@/features/school/calendar';
import { navigationFor } from '@/features/shell/navigation';
import { SchoolMark } from '@/features/shell/SchoolMark';
import { SideNav } from '@/features/shell/SideNav';
import { staffName } from '@/features/staff/names';

export default async function SchoolLayout({ children, params }: { children: ReactNode; params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const viewer = await requireViewer(slug);
  const displayName = viewer.staff ? staffName(viewer.staff) : `${viewer.guardian?.title} ${viewer.guardian?.name}`;

  return (
    <div className="shell" style={{ ['--accent' as string]: viewer.school.accentColor }}>
      <aside className="sidebar">
        <div className="school-mark">
          <SchoolMark school={viewer.school} subtitle={termLabel(viewer.currentTerm)} />
        </div>
        <SideNav basePath={`/${slug}`} groups={navigationFor(viewer.role, viewer.ownClassId)} />
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="muted">{viewer.school.address}</span>
          <div className="topbar__user">
            <span>
              {displayName} <span className="muted">· {roleLabels[viewer.role]}</span>
            </span>
            <form action={signOut.bind(null, slug)}>
              <button className="button button--small" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
