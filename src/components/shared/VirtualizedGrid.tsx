'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedGridProps<TItem> {
  items: TItem[];
  getItemKey: (item: TItem) => string;
  renderItem: (item: TItem) => React.ReactNode;
  estimateSize?: number;
  columns?: number;
  className?: string;
}

export function VirtualizedGrid<TItem>({
  items,
  getItemKey,
  renderItem,
  estimateSize = 280,
  columns = 3,
  className,
}: VirtualizedGridProps<TItem>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className={cn('max-h-[70vh] overflow-auto', className)} data-testid="page-virtualized-grid">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rowItems.map((item) => (
                <div key={getItemKey(item)}>{renderItem(item)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
