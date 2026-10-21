import { scoreSheetProgress } from '@/features/assessment/progress';
import { ScoreSheetTable } from '@/features/assessment/ScoreSheetTable';
import { allow, canViewAcademics } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';

export default async function ScoreSheetsPage({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<{ class?: string }> }) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canViewAcademics(viewer) && viewer.role !== 'parent');
  const classId = (await searchParams).class;
  const isHead = viewer.role === 'headteacher';
  const [sheets, classes] = await Promise.all([
    scoreSheetProgress(viewer, classId ? [classId] : undefined, isHead ? undefined : viewer.staff!.id),
    isHead ? getClasses(viewer.school.id, viewer.currentTerm.academicYear) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Score sheets" meta={`${termLabel(viewer.currentTerm)} · Class score out of 30, examination out of 100`} />
      {isHead && (
        <FilterBar count={`${sheets.length} sheets`}>
          <label className="field">
            <span>Class</span>
            <select name="class" defaultValue={classId ?? ''}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>
      )}
      <ScoreSheetTable base={`/${school}`} sheets={sheets} />
    </>
  );
}
