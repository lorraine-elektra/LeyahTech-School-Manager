import Link from 'next/link';
import { ActivityList } from '@/features/activity/ActivityList';
import { activityPage } from '@/features/activity/queries';
import { scoreSheetProgress } from '@/features/assessment/progress';
import { sheetsOnDate } from '@/features/attendance/queries';
import { attendanceRate, totalsFromStatuses } from '@/features/attendance/summary';
import type { Viewer } from '@/features/auth/session';
import { summariseCollection } from '@/features/fees/accounts';
import { schoolFeeAccounts } from '@/features/fees/queries';
import { isSchoolDay, termLabel, todayIso } from '@/features/school/calendar';
import { getClasses, getStaff } from '@/features/school/queries';
import { staffName } from '@/features/staff/names';
import { activeRollCounts } from '@/features/students/queries';
import { BarList, Meter, toneForRate } from '@/ui/Charts';
import { Icon } from '@/ui/Icon';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { formatDateWithDay, formatMoney, formatPercent, formatTime } from '@/ui/format';
import { WeeklyCollections } from './WeeklyCollections';
import { greeting } from './greeting';

export async function HeadteacherOverview({ viewer }: { viewer: Viewer }) {
  const base = `/${viewer.school.slug}`;
  const today = todayIso();
  const { academicYear } = viewer.currentTerm;
  const [classes, staff, sheets, feeRows, progress, activity, rollCounts] = await Promise.all([
    getClasses(viewer.school.id, academicYear),
    getStaff(viewer.school.id),
    sheetsOnDate(viewer.school.id, today),
    schoolFeeAccounts(viewer),
    scoreSheetProgress(viewer),
    activityPage(viewer.school.id, { limit: 5 }),
    activeRollCounts(viewer.school.id, academicYear, today),
  ]);
  const collection = summariseCollection(feeRows.map((r) => r.account));
  const collectedShare = collection.due ? (collection.collected / collection.due) * 100 : 0;
  const onRoll = [...rollCounts.values()].reduce((sum, n) => sum + n, 0);
  const todayTotals = totalsFromStatuses(sheets.flatMap((s) => s.entries.map((e) => e.status)));
  const todayRate = attendanceRate(todayTotals);
  const sheetsEntered = progress.filter((p) => p.onRoll > 0 && p.classScoresEntered === p.onRoll).length;
  const scoreShare = progress.length ? (sheetsEntered / progress.length) * 100 : 0;
  const schoolDay = isSchoolDay(today);

  const feeByClass = classes.map((schoolClass) => {
    const summary = summariseCollection(feeRows.filter((r) => r.schoolClass?.id === schoolClass.id && r.student.status === 'Active').map((r) => r.account));
    return { schoolClass, share: summary.due ? (summary.collected / summary.due) * 100 : 0 };
  });

  return (
    <>
      <PageHeader title={`Good ${greeting()}, ${viewer.staff?.title} ${viewer.staff?.surname}`} meta={`${termLabel(viewer.currentTerm)} · ${formatDateWithDay(today)}`} />

      <dl className="key-figures">
        <div>
          <dt>
            <Icon name="students" size={14} /> Students on roll
          </dt>
          <dd>{onRoll}</dd>
          <div className="key-figures__note">
            {classes.length} classes · {staff.length} staff
          </div>
        </div>
        <div>
          <dt>
            <Icon name="attendance" size={14} /> In school today
          </dt>
          <dd>{todayRate === undefined ? '-' : formatPercent(todayRate)}</dd>
          <div style={{ marginTop: 8 }}>
            <Meter value={todayRate ?? 0} tone={toneForRate(todayRate)} thin />
          </div>
          <div className="key-figures__note">
            {schoolDay ? `${sheets.length} of ${classes.length} registers marked` : 'Not a school day'}
          </div>
        </div>
        <div>
          <dt>
            <Icon name="fees" size={14} /> Fees collected
          </dt>
          <dd>{formatPercent(collectedShare)}</dd>
          <div style={{ marginTop: 8 }}>
            <Meter value={collectedShare} tone={toneForRate(collectedShare, 75, 50)} thin />
          </div>
          <div className="key-figures__note">
            {formatMoney(collection.collected)} of {formatMoney(collection.due)}
          </div>
        </div>
        <div>
          <dt>
            <Icon name="scores" size={14} /> Score sheets complete
          </dt>
          <dd>
            {sheetsEntered} <span className="muted" style={{ fontSize: 14 }}>of {progress.length}</span>
          </dd>
          <div style={{ marginTop: 8 }}>
            <Meter value={scoreShare} thin />
          </div>
          <div className="key-figures__note">Class scores for this term</div>
        </div>
      </dl>

      <div className="grid-2">
        <Section title="Attendance today" icon="attendance" aside={<Link href={`${base}/attendance`}>All registers</Link>}>
          <div className="panel">
            <BarList
              rows={classes.map((schoolClass) => {
                const sheet = sheets.find((s) => s.classId === schoolClass.id);
                const rate = sheet ? attendanceRate(totalsFromStatuses(sheet.entries.map((e) => e.status))) : undefined;
                return {
                  key: schoolClass.id,
                  label: <Link href={`${base}/attendance/${schoolClass.id}`}>{schoolClass.name}</Link>,
                  value: rate ?? 0,
                  tone: toneForRate(rate),
                  display: sheet ? formatPercent(rate ?? 0) : <span className="warn">{schoolDay ? 'Not marked' : '-'}</span>,
                };
              })}
            />
          </div>
        </Section>
        <Section title="Fees collected by class" icon="fees" aside={<Link href={`${base}/fees`}>Fee accounts</Link>}>
          <div className="panel">
            <BarList
              rows={feeByClass.map(({ schoolClass, share }) => ({
                key: schoolClass.id,
                label: schoolClass.name,
                value: share,
                tone: toneForRate(share, 75, 50),
                display: formatPercent(share),
              }))}
            />
          </div>
        </Section>
      </div>

      <div className="grid-2">
        <Section title="Collections by week" icon="money" aside="This term">
          <div className="panel">
            <WeeklyCollections payments={feeRows.flatMap((r) => r.account.payments)} termStart={viewer.currentTerm.startsOn} today={today} />
          </div>
        </Section>
        <Section title="Recent activity" icon="activity" aside={<Link href={`${base}/activity`}>Full log</Link>}>
          <div className="panel">
            <ActivityList entries={activity.rows} base={base} today={today} />
          </div>
        </Section>
      </div>

      <Section title="Registers today" icon="schedule">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Class teacher</th>
                <th className="num">On roll</th>
                <th className="num">Present</th>
                <th className="num">Late</th>
                <th className="num">Excused</th>
                <th className="num">Absent</th>
                <th>Marked</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((schoolClass) => {
                const sheet = sheets.find((s) => s.classId === schoolClass.id);
                const counts = sheet && totalsFromStatuses(sheet.entries.map((e) => e.status));
                return (
                  <tr key={schoolClass.id}>
                    <td>
                      <Link href={`${base}/classes/${schoolClass.id}`}>{schoolClass.name}</Link>
                    </td>
                    <td>{staffName(staff.find((s) => s.id === schoolClass.classTeacherId))}</td>
                    <td className="num">{rollCounts.get(schoolClass.id) ?? 0}</td>
                    <td className="num">{counts?.present ?? ''}</td>
                    <td className="num">{counts?.late ?? ''}</td>
                    <td className="num">{counts?.excused ?? ''}</td>
                    <td className={counts?.absent ? 'num bad' : 'num'}>{counts?.absent ?? ''}</td>
                    <td>{sheet ? <span className="muted">{formatTime(sheet.markedAt)}</span> : schoolDay ? <span className="tag tag--warn">Not marked</span> : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
