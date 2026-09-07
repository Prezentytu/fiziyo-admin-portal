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
}

export function StatTiles({ tiles, className }: StatTilesProps) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          data-testid={tile.testId ?? `page-stat-tile-${tile.id}`}
          onClick={tile.onClick}
          className={cn(
            'rounded-xl border p-4 text-left transition-colors',
            tile.active
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border/60 bg-card text-foreground hover:bg-surface-light'
          )}
        >
          <p className="text-2xl font-semibold">{tile.value}</p>
          <p className="text-sm text-muted-foreground">{tile.label}</p>
        </button>
      ))}
    </div>
  );
}
