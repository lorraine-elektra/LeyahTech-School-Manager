import type { Role } from '@/features/auth/types';

export interface NavGroup {
  heading?: string;
  links: { href: string; label: string }[];
}

export function navigationFor(role: Role, ownClassId: string | null): NavGroup[] {
  switch (role) {
    case 'headteacher':
      return [
        { links: [{ href: '', label: 'Overview' }] },
        {
          heading: 'School',
          links: [
            { href: '/students', label: 'Students' },
            { href: '/classes', label: 'Classes' },
            { href: '/movements', label: 'Admissions and exits' },
            { href: '/staff', label: 'Staff' },
          ],
        },
        {
          heading: 'Academics',
          links: [
            { href: '/attendance', label: 'Attendance' },
            { href: '/scores', label: 'Score sheets' },
            { href: '/reports', label: 'Report cards' },
            { href: '/promotion', label: 'Promotion' },
          ],
        },
        {
          heading: 'Fees',
          links: [
            { href: '/fees', label: 'Fee accounts' },
            { href: '/fees/receipts', label: 'Receipts' },
            { href: '/fees/schedule', label: 'Fee schedule' },
            { href: '/fees/scholarships', label: 'Scholarships' },
          ],
        },
      ];
    case 'bursar':
      return [
        { links: [{ href: '', label: 'Overview' }] },
        {
          heading: 'Fees',
          links: [
            { href: '/fees', label: 'Fee accounts' },
            { href: '/fees/payments/new', label: 'Record payment' },
            { href: '/fees/receipts', label: 'Receipts' },
            { href: '/fees/schedule', label: 'Fee schedule' },
            { href: '/fees/scholarships', label: 'Scholarships' },
          ],
        },
        {
          heading: 'School',
          links: [
            { href: '/students', label: 'Students' },
            { href: '/movements', label: 'Admissions and exits' },
          ],
        },
      ];
    case 'classTeacher':
      return [
        { links: [{ href: '', label: 'Overview' }] },
        {
          heading: 'My class',
          links: [
            { href: `/classes/${ownClassId}`, label: 'Class list' },
            { href: `/attendance/${ownClassId}`, label: 'Mark attendance' },
            { href: `/attendance/${ownClassId}/register`, label: 'Term register' },
            { href: `/reports/${ownClassId}`, label: 'Report cards' },
          ],
        },
        { heading: 'Teaching', links: [{ href: '/scores', label: 'Score sheets' }] },
      ];
    case 'subjectTeacher':
      return [
        { links: [{ href: '', label: 'Overview' }] },
        { heading: 'Teaching', links: [{ href: '/scores', label: 'Score sheets' }, { href: '/students', label: 'My students' }] },
      ];
    case 'parent':
      return [{ links: [{ href: '', label: 'My children' }] }];
  }
}
