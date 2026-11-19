'use client';

import { cn } from '@/lib/utils';
import { useUnseenReleaseNote } from './useReleaseNotes';

interface WhatsNewDotProps {
  readonly testId: string;
  readonly className?: string;
}

/**
 * Tint dot next to „Ustawienia” while a published release is unseen.
 * Decorative: hidden from the accessibility tree so the parent link, menu item or tab keeps its
 * name („Ustawienia”, not „Ustawienia Nowości w portalu”). The banner and the bell announce the release.
 */
export function WhatsNewDot({ testId, className }: WhatsNewDotProps) {
  const unseen = useUnseenReleaseNote();
  if (!unseen) return null;

  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 shrink-0 rounded-full bg-tint', className)}
      data-testid={testId}
    />
  );
}
