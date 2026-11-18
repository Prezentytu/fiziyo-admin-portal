'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMarkReleaseNoteSeen, useUnseenReleaseNote } from './useReleaseNotes';
import { releaseNoteHref, shouldShowReleaseBanner } from './utils/releaseNotes';

/** Bar above dashboard content for a release Ops sent a notification about. */
export function ReleaseNoteBanner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const note = useUnseenReleaseNote();
  const markSeen = useMarkReleaseNoteSeen();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  if (!note || !shouldShowReleaseBanner(note, { pathname, settingsTab: searchParams.get('tab'), dismissedId })) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedId(note.id);
    markSeen(note.id);
  };

  return (
    <div
      role="status"
      className="mb-4 flex shrink-0 flex-wrap items-center gap-3 rounded-card border border-tint/30 bg-tint-muted px-4 py-3 sm:flex-nowrap"
      data-testid="whats-new-banner"
    >
      <Sparkles className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">Nowości w portalu: {note.title}</p>
        {note.lead && <p className="truncate text-[13px] text-label-secondary">{note.lead}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild size="sm" data-testid="whats-new-banner-open">
          <Link href={releaseNoteHref(note.id)} onClick={() => markSeen(note.id)}>
            Zobacz, co nowego
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zamknij"
          onClick={handleDismiss}
          data-testid="whats-new-banner-close"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
