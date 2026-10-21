import { Tag } from '@/ui/Tag';
import type { FeeStanding } from './accounts';

export function FeeStandingTag({ standing }: { standing: FeeStanding }) {
  const tone = standing === 'Paid' || standing === 'In credit' ? 'good' : standing === 'Part-paid' ? 'warn' : 'bad';
  return <Tag tone={tone}>{standing}</Tag>;
}
