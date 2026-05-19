'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShopPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

export default function ShopPagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  className,
}: ShopPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = pageNumbers(page, totalPages);

  return (
    <nav
      className={cn('mt-12 pt-8 border-t border-brand-bone', className)}
      aria-label="Product pagination"
    >
      <p
        className="text-center text-sm text-brand-sienna mb-6"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Showing {start}–{end} of {total} piece{total !== 1 ? 's' : ''}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-brand-bone text-brand-obsidian hover:border-brand-turquoise disabled:opacity-40 disabled:pointer-events-none transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-brand-sienna"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'min-w-[40px] px-3 py-2 text-sm border transition-colors',
                p === page
                  ? 'border-brand-obsidian bg-brand-obsidian text-brand-bone'
                  : 'border-brand-bone text-brand-obsidian hover:border-brand-turquoise'
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-brand-bone text-brand-obsidian hover:border-brand-turquoise disabled:opacity-40 disabled:pointer-events-none transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
