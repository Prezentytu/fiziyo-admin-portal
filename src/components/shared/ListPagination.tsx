'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ListPaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  /** Prefix of test IDs, e.g. `exercise` gives `exercise-pagination-next`. */
  readonly testIdPrefix: string;
}

/** Footer of a server-paged list: count, page size, previous and next. */
export function ListPagination({
  page,
  totalPages,
  totalCount,
  visibleCount,
  pageSize,
  pageSizeOptions,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  testIdPrefix,
}: ListPaginationProps) {
  return (
    <nav
      aria-label="Stronicowanie"
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
        Wyświetlono {visibleCount} z {totalCount}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          data-testid={`${testIdPrefix}-page-size`}
        >
          <SelectTrigger
            className="h-8 w-[86px] bg-background"
            aria-label="Liczba na stronie"
            data-testid={`${testIdPrefix}-page-size-select`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          data-testid={`${testIdPrefix}-pagination-prev`}
        >
          Poprzednia
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground" data-testid={`${testIdPrefix}-pagination-indicator`}>
          Strona {page} z {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          data-testid={`${testIdPrefix}-pagination-next`}
        >
          Następna
        </Button>
      </div>
    </nav>
  );
}
