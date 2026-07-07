import { cn } from '@/lib/utils';

interface DirtyDotProps {
  active: boolean;
  className?: string;
}

/**
 * Subtle "unsaved change" marker — an amber dot coherent with the sticky save bar.
 * Meaning is not conveyed by color alone: a `title`/`aria-label` provides an accessible hint.
 */
export function DirtyDot({ active, className }: Readonly<DirtyDotProps>) {
  if (!active) return null;
  return (
    <span
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500', className)}
      role="img"
      aria-label="Niezapisana zmiana"
      title="Niezapisana zmiana"
      data-testid="exercise-field-dirty-dot"
    />
  );
}
