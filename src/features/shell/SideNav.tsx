'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/ui/Icon';
import type { NavGroup } from './navigation';

export function SideNav({ basePath, groups }: { basePath: string; groups: NavGroup[] }) {
  const pathname = usePathname();
  const allHrefs = groups.flatMap((g) => g.links.map((l) => basePath + l.href));
  // The longest matching link wins, so /fees/receipts does not also highlight /fees.
  const activeHref = allHrefs
    .filter((href) => pathname === href || (href !== basePath && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="nav">
      {groups.map((group, index) => (
        <div key={group.heading ?? index}>
          {group.heading && <div className="nav__heading">{group.heading}</div>}
          {group.links.map((link) => {
            const href = basePath + link.href;
            return (
              <Link key={href} href={href} className={href === activeHref ? 'active' : undefined}>
                <Icon name={link.icon} />
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
