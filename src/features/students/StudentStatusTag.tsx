import { Tag } from '@/ui/Tag';
import type { StudentStatus } from './types';

const tones = { Active: 'good', Withdrawn: 'bad', 'Transferred out': 'warn', Completed: 'info' } as const;

export function StudentStatusTag({ status }: { status: StudentStatus }) {
  return <Tag tone={tones[status]}>{status}</Tag>;
}
