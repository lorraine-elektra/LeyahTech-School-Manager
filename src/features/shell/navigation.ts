import type { Role } from '@/features/auth/types';
import type { IconName } from '@/ui/Icon';

export interface NavLink {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavGroup {
  heading?: string;
  links: NavLink[];
}

const overview: NavLink = { href: '', label: 'Overview', icon: 'overview' };

export function navigationFor(role: Role, ownClassId: string | null): NavGroup[] {
  switch (role) {
    case 'headteacher':
      return [
        { links: [overview] },
        {
          heading: 'School',
          links: [
            { href: '/students', label: 'Students', icon: 'students' },
            { href: '/classes', label: 'Classes', icon: 'classes' },
            { href: '/movements', label: 'Admissions and exits', icon: 'movements' },
            { href: '/staff', label: 'Staff', icon: 'staff' },
          ],
        },
        {
          heading: 'Academics',
          links: [
            { href: '/attendance', label: 'Attendance', icon: 'attendance' },
            { href: '/scores', label: 'Score sheets', icon: 'scores' },
            { href: '/reports', label: 'Report cards', icon: 'reports' },
            { href: '/promotion', label: 'Promotion', icon: 'promotion' },
          ],
        },
        {
          heading: 'Fees',
          links: [
            { href: '/fees', label: 'Fee accounts', icon: 'fees' },
            { href: '/fees/receipts', label: 'Receipts', icon: 'receipt' },
            { href: '/fees/schedule', label: 'Fee schedule', icon: 'schedule' },
            { href: '/fees/scholarships', label: 'Scholarships', icon: 'scholarship' },
          ],
        },
        {
          heading: 'Admin',
          links: [
            { href: '/activity', label: 'Activity', icon: 'activity' },
            { href: '/settings', label: 'Settings', icon: 'settings' },
          ],
        },
      ];
    case 'bursar':
      return [
        { links: [overview] },
        {
          heading: 'Fees',
          links: [
            { href: '/fees', label: 'Fee accounts', icon: 'fees' },
            { href: '/fees/payments/new', label: 'Record payment', icon: 'payment' },
            { href: '/fees/receipts', label: 'Receipts', icon: 'receipt' },
            { href: '/fees/schedule', label: 'Fee schedule', icon: 'schedule' },
            { href: '/fees/scholarships', label: 'Scholarships', icon: 'scholarship' },
          ],
        },
        {
          heading: 'School',
          links: [
            { href: '/students', label: 'Students', icon: 'students' },
            { href: '/movements', label: 'Admissions and exits', icon: 'movements' },
          ],
        },
      ];
    case 'classTeacher':
      return [
        { links: [overview] },
        {
          heading: 'My class',
          links: [
            { href: `/classes/${ownClassId}`, label: 'Class list', icon: 'students' },
            { href: `/attendance/${ownClassId}`, label: 'Mark attendance', icon: 'attendance' },
            { href: `/attendance/${ownClassId}/register`, label: 'Term register', icon: 'schedule' },
            { href: `/reports/${ownClassId}`, label: 'Report cards', icon: 'reports' },
          ],
        },
        { heading: 'Teaching', links: [{ href: '/scores', label: 'Score sheets', icon: 'scores' }] },
      ];
    case 'subjectTeacher':
      return [
        { links: [overview] },
        {
          heading: 'Teaching',
          links: [
            { href: '/scores', label: 'Score sheets', icon: 'scores' },
            { href: '/students', label: 'My students', icon: 'students' },
          ],
        },
      ];
    case 'parent':
      return [{ links: [{ ...overview, label: 'My children', icon: 'students' }] }];
  }
}
