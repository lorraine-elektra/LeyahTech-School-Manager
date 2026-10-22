import { sumMoney } from '@/features/fees/accounts';
import type { FeePayment } from '@/features/fees/types';
import { addDays } from '@/features/school/calendar';
import { ColumnsChart } from '@/ui/Charts';
import { formatDate } from '@/ui/format';

// Weeks run Monday to Sunday; the last column is the current week.
export function WeeklyCollections({ payments, termStart, today, weeks = 8 }: { payments: FeePayment[]; termStart: string; today: string; weeks?: number }) {
  const monday = (iso: string) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
  const firstWeek = monday(termStart);
  const starts: string[] = [];
  for (let start = monday(today); starts.length < weeks && start >= firstWeek; start = addDays(start, -7)) starts.unshift(start);
  const valid = payments.filter((p) => !p.voidedOn);

  return (
    <ColumnsChart
      columns={starts.map((start) => {
        const end = addDays(start, 6);
        const total = sumMoney(valid.filter((p) => p.paidOn >= start && p.paidOn <= end), (p) => p.amount);
        return {
          key: start,
          label: formatDate(start).replace(/ \d{4}$/, ''),
          value: total,
          display: total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0),
        };
      })}
    />
  );
}
