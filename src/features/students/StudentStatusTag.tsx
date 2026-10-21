import { Tag } from '@/ui/Tag';
import type { StudentStatus } from './types';

export function StudentStatusTag({ status }: { status: StudentStatus }) {
  if (status === 'Active') return <span className="muted">Active</span>;
  return <Tag tone={status === 'Withdrawn' ? 'bad' : status === 'Transferred out' ? 'warn' : 'neutral'}>{status}</Tag>;
}
