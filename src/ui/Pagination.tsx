import Link from 'next/link';
import { Icon } from './Icon';

export const PAGE_SIZE = 50;

export function pageFrom(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// Keeps the current filters in the link and only changes the page number.
export function Pagination({ page, total, pageSize = PAGE_SIZE, basePath, params }: { page: number; total: number; pageSize?: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const hrefFor = (target: number) => {
    const query = new URLSearchParams(Object.entries({ ...params, page: String(target) }).filter((entry): entry is [string, string] => !!entry[1]));
    return `${basePath}?${query}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pagination no-print">
      <span>
        {from} to {to} of {total}
      </span>
      <div className="pagination__links">
        {page > 1 && (
          <Link className="button button--small" href={hrefFor(page - 1)}>
            <Icon name="previous" size={14} /> Previous
          </Link>
        )}
        <span className="button button--small button--ghost">
          Page {page} of {pages}
        </span>
        {page < pages && (
          <Link className="button button--small" href={hrefFor(page + 1)}>
            Next <Icon name="next" size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
