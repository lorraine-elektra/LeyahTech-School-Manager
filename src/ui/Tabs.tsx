'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Tabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="tabs no-print">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'active' : undefined}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
