import React, { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination for lists that are already fully loaded.
 *
 * `usePagination` returns the slice plus the controls' state. It keeps the
 * current page valid on its own: when the underlying list shrinks — a vet
 * cancels the last appointment on page 3 — the page clamps instead of showing
 * an empty list with no way back.
 */
export function usePagination(items = [], pageSize = 5) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Clamp rather than reset: staying on page 2 after confirming one booking is
  // far less jarring than being thrown back to the top of the list.
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const slice = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    pageCount,
    total,
    slice,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    next: () => setPage((p) => Math.min(p + 1, pageCount)),
    prev: () => setPage((p) => Math.max(p - 1, 1)),
    setPage,
  };
}

/**
 * Prev/Next controls. Renders nothing when everything fits on one page —
 * dead controls are noise.
 */
const Pagination = ({ page, pageCount, from, to, total, next, prev, label = 'items' }) => {
  if (pageCount <= 1) return null;
  const btn =
    'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100">
      <p className="text-[11px] text-slate-400 font-semibold m-0 tabular-nums">
        Showing {from}–{to} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${btn} bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700`}
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          Prev
        </button>
        <span className="text-[11px] font-bold text-slate-500 tabular-nums px-1">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={`${btn} bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700`}
        >
          Next
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
