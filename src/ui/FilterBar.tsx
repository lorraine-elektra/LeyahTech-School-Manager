import type { ReactNode } from 'react';

// Filters submit as a plain GET form so the URL can be bookmarked and shared.
export function FilterBar({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <form method="get" className="table-toolbar no-print">
      {children}
      <button className="button" type="submit">
        Apply
      </button>
      {count !== undefined && <span className="table-count">{count}</span>}
    </form>
  );
}
