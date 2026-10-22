import { ActivityList } from '@/features/activity/ActivityList';
import { activityPage } from '@/features/activity/queries';
import { activityAreas, type ActivityArea } from '@/features/activity/record';
import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { todayIso } from '@/features/school/calendar';
import { EmptyState } from '@/ui/EmptyState';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';
import { PAGE_SIZE, pageFrom, Pagination } from '@/ui/Pagination';

export default async function ActivityPage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ area?: string; page?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(viewer.role === 'headteacher');
  const filters = await searchParams;
  const area = activityAreas.find((a) => a === filters.area) as ActivityArea | undefined;
  const page = pageFrom(filters.page);
  const { rows, total } = await activityPage(viewer.school.id, { area, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  return (
    <>
      <PageHeader title="Activity" meta="Changes made by staff, newest first" />
      <FilterBar count={`${total} entries`}>
        <label className="field">
          <span>Area</span>
          <select name="area" defaultValue={area ?? ''}>
            <option value="">All areas</option>
            {activityAreas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="panel" style={{ maxWidth: 820 }}>
        {rows.length === 0 ? (
          <EmptyState icon="activity">Nothing has been recorded here yet.</EmptyState>
        ) : (
          <ActivityList entries={rows} base={`/${school}`} today={todayIso()} />
        )}
      </div>
      <div style={{ maxWidth: 820 }}>
        <Pagination page={page} total={total} basePath={`/${school}/activity`} params={{ area }} />
      </div>
    </>
  );
}
