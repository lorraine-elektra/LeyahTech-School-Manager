import type { School } from '@/features/school/types';

export function SchoolMark({ school, subtitle }: { school: Pick<School, 'name' | 'shortName'>; subtitle: string }) {
  return (
    <div className="school-mark" style={{ padding: 0, border: 'none' }}>
      <div className="school-mark__crest" aria-hidden="true">
        {school.shortName}
      </div>
      <div>
        <div className="school-mark__name">{school.name}</div>
        <div className="school-mark__term">{subtitle}</div>
      </div>
    </div>
  );
}
