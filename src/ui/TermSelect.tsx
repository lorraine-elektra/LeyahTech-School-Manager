import { termLabel } from '@/features/school/calendar';
import type { Term } from '@/features/school/types';

export function TermSelect({ terms, value, name = 'term' }: { terms: Term[]; value: string; name?: string }) {
  return (
    <label className="field">
      <span>Term</span>
      <select name={name} defaultValue={value}>
        {[...terms].reverse().map((term) => (
          <option key={term.id} value={term.id}>
            {termLabel(term)}
          </option>
        ))}
      </select>
    </label>
  );
}
