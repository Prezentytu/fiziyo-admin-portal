import { cn } from '@/lib/utils';

export interface StatTile {
  id: string;
  label: string;
  value: number | string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}

interface StatTilesProps {
  tiles: StatTile[];
  className?: string;
  variant?: 'metrics' | 'filters' | 'summary';
}

export function StatTiles({ tiles, className, variant = 'metrics' }: StatTilesProps) {
  return (
    <div
      className={cn(
        variant === 'filters'
          ? 'flex min-w-0 flex-wrap gap-1'
          : variant === 'summary'
            ? 'flex min-w-0 flex-wrap gap-x-6 gap-y-2'
            : 'grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {tiles.map((tile) => {
        const Tile = tile.onClick ? 'button' : 'div';

        return (
          <Tile
            key={tile.id}
            type={tile.onClick ? 'button' : undefined}
            data-testid={tile.testId ?? `page-stat-tile-${tile.id}`}
            onClick={tile.onClick}
            aria-pressed={tile.onClick ? Boolean(tile.active) : undefined}
            className={cn(
              'min-w-0 text-left text-foreground wrap-anywhere',
              variant === 'filters'
                ? 'flex min-h-11 items-center gap-2 rounded-sm px-3 py-2'
                : variant === 'summary'
                  ? 'flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1'
                  : 'border-l-2 px-4 py-2',
              tile.active ? 'border-primary bg-primary-muted' : 'border-border',
              tile.onClick && variant === 'summary' && 'min-h-11 rounded-sm px-2',
              tile.onClick &&
                'cursor-pointer transition-colors duration-150 hover:bg-surface-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            <p
              className={cn(
                'tracking-normal tabular-nums',
                variant === 'filters'
                  ? 'order-last text-xs text-muted-foreground'
                  : variant === 'summary'
                    ? 'text-base font-semibold leading-tight'
                    : 'text-2xl font-semibold leading-tight'
              )}
            >
              {tile.value}
            </p>
            <p
              className={cn(
                'text-sm',
                variant === 'filters' ? 'font-medium' : 'text-muted-foreground',
                variant === 'metrics' && 'mt-1'
              )}
            >
              {tile.label}
            </p>
          </Tile>
        );
      })}
    </div>
  );
}
