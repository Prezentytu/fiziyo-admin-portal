'use client';

import { cn } from '@/lib/utils';
import { useUnseenReleaseNote } from './useReleaseNotes';

interface WhatsNewDotProps {
  readonly testId: string;
  readonly className?: string;
}

/** Tint dot next to „Ustawienia” while a published release is unseen. */
export function WhatsNewDot({ testId, className }: WhatsNewDotProps) {
  const unseen = useUnseenReleaseNote();
  if (!unseen) return null;

  return (
    <span
      role="img"
      aria-label="Nowości w portalu"
      className={cn('inline-block size-2 shrink-0 rounded-full bg-tint', className)}
      data-testid={testId}
    />
  );
}
