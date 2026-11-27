'use client';

import { forwardRef, useImperativeHandle, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { ExerciseNameReviewRow } from '@/graphql/types/exerciseNameReview.types';
import { NO_FAMILY_LABEL, type NameReviewItem } from '@/features/exercise-names/utils/nameReviewRows';

/** Estimated row height before measuring; real heights come from `measureElement` (long names wrap). */
const ESTIMATED_ROW_HEIGHT = 86;

export interface NameReviewListHandle {
  scrollToIndex: (index: number, align: 'auto' | 'center') => void;
}

interface NameReviewListProps {
  items: ReadonlyArray<NameReviewItem>;
  activeIndex: number;
  renderRow: (row: ExerciseNameReviewRow, isVariant: boolean) => ReactNode;
}

/**
 * Thousands of rows: only the ones near the viewport are mounted (each has a field, switch, picker and buttons).
 * The virtualizer lives here, not in the page: it re-renders on every scroll frame, and that should not re-render
 * the toolbar and filters (the family select holds one item per family).
 */
export const NameReviewList = forwardRef<NameReviewListHandle, NameReviewListProps>(function NameReviewList(
  { items, activeIndex, renderRow },
  ref
) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => items[index].key,
    scrollMargin,
    overscan: 8,
  });

  useImperativeHandle(
    ref,
    () => ({ scrollToIndex: (index, align) => virtualizer.scrollToIndex(index, { align }) }),
    [virtualizer]
  );

  // The page scrolls inside the dashboard `<main>`, not the window, and the list starts below the toolbar,
  // filters, bulk bar and log panel; their height changes move it. The `overflow-x-auto` wrapper also computes
  // `overflow-y: auto`, so the nearest scrollable ancestor would be the wrong one.
  useLayoutEffect(() => {
    const list = listRef.current;
    const parent = list?.closest('main') ?? null;
    setScrollElement(parent);
    const page = list?.closest<HTMLElement>('[data-testid="name-review-page"]');
    if (!list || !parent || !page) return undefined;
    const measure = () =>
      setScrollMargin(
        Math.round(list.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop)
      );
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
  }, [activeIndex, virtualizer]);

  return (
    <div
      ref={listRef}
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
      data-testid="name-review-list"
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const item = items[virtualItem.index];
        return (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
          >
            {item.kind === 'row' ? (
              renderRow(item.row, item.isVariant)
            ) : item.kind === 'variants' ? (
              <p
                className="border-b border-border bg-fill-quaternary px-8 py-1 text-xs text-muted-foreground"
                data-testid={`name-review-family-${item.pillarId}`}
              >
                Warianty: {item.count}
              </p>
            ) : (
              <p
                className="border-b border-border bg-fill-quaternary px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                data-testid="name-review-family-none"
              >
                {NO_FAMILY_LABEL} ({item.count})
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});
