import Link from 'next/link';
import { Icon, type IconName } from '@/ui/Icon';
import { formatDate, formatTime } from '@/ui/format';
import type { ActivityEntry } from './queries';
import type { ActivityArea } from './record';

const areaIcons: Record<ActivityArea, IconName> = {
  Students: 'students',
  Attendance: 'attendance',
  Scores: 'scores',
  Reports: 'reports',
  Fees: 'money',
  Promotion: 'promotion',
  Settings: 'settings',
  Staff: 'staff',
};

export function ActivityList({ entries, base, today }: { entries: ActivityEntry[]; base: string; today: string }) {
  return (
    <ul className="activity-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="activity-list__icon">
            <Icon name={areaIcons[entry.area]} size={15} />
          </span>
          <div>
            <div>{entry.link ? <Link href={base + entry.link}>{entry.action}</Link> : entry.action}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {entry.actorName} · {entry.area}
            </div>
          </div>
          <span className="activity-list__time">{entry.at.slice(0, 10) === today ? formatTime(entry.at) : formatDate(entry.at.slice(0, 10))}</span>
        </li>
      ))}
    </ul>
  );
}
