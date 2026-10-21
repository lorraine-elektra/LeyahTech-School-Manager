import { allow, canManagePromotion } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { confirmPromotion } from '@/features/promotion/actions';
import { promotionRows } from '@/features/promotion/data';
import { PromotionForm } from '@/features/promotion/PromotionForm';
import { termsOfYear } from '@/features/school/calendar';
import { getClasses } from '@/features/school/queries';
import { studentRegisterName } from '@/features/students/names';
import { PROMOTION_PASS_MARK } from '@/features/school/grading';
import { formatDate } from '@/ui/format';
import { FilterBar } from '@/ui/FilterBar';
import { PageHeader } from '@/ui/PageHeader';

export default async function PromotionPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ year?: string; class?: string; confirmed?: string }>;
}) {
  const { school } = await params;
  const viewer = await requireViewer(school);
  allow(canManagePromotion(viewer));
  const filters = await searchParams;
  const years = [...new Set(viewer.terms.filter((t) => t.startsOn <= viewer.currentTerm.startsOn).map((t) => t.academicYear))].reverse();
  const classes = (await Promise.all(years.map((y) => getClasses(viewer.school.id, y)))).flat();
  // Early in the year there are no results to suggest from, so open on last year's record.
  const defaultYear = viewer.currentTerm.name === '1st Term' && years[1] ? years[1] : years[0];
  const selected = classes.find((c) => c.id === filters.class) ?? classes.find((c) => c.academicYear === defaultYear)!;
  const { terms, rows } = await promotionRows(viewer, selected);
  const isCurrentYear = selected.academicYear === viewer.currentTerm.academicYear;
  const finalTerm = termsOfYear(viewer.terms, selected.academicYear).at(-1)!;
  const canConfirm = isCurrentYear && viewer.currentTerm.id === finalTerm.id;
  const repeats = rows.filter((r) => (r.recorded ?? r.proposed) === 'Repeated').length;

  return (
    <>
      <PageHeader
        title="Promotion"
        meta={`${selected.name}, ${selected.academicYear} · Pass mark ${PROMOTION_PASS_MARK} annual average · ${repeats} ${rows.some((r) => r.recorded) ? 'repeated' : 'suggested to repeat'}`}
      />
      {filters.confirmed && <div className="notice notice--success" style={{ marginBottom: 12 }}>Promotion confirmed. Students are enrolled in their classes for next year.</div>}
      <FilterBar>
        <label className="field">
          <span>Class</span>
          <select name="class" defaultValue={selected.id}>
            {years.map((year) => (
              <optgroup key={year} label={year}>
                {classes
                  .filter((c) => c.academicYear === year)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {year}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </FilterBar>
      <PromotionForm
        key={selected.id}
        action={confirmPromotion.bind(null, school, selected.id)}
        canConfirm={canConfirm}
        closedMessage={
          isCurrentYear && !canConfirm
            ? `Promotion for ${selected.academicYear} is confirmed in the 3rd term, after final results are in. The 3rd term ends on ${formatDate(finalTerm.endsOn)}. Suggestions use the term averages published so far.`
            : undefined
        }
        termNames={terms.map((t) => t.name)}
        rows={rows.map((row) => ({
          studentId: row.student.id,
          admissionNo: row.student.admissionNo,
          name: studentRegisterName(row.student),
          termAverages: row.termAverages,
          annualAverage: row.annualAverage,
          proposed: row.proposed,
          recorded: row.recorded,
        }))}
      />
    </>
  );
}
