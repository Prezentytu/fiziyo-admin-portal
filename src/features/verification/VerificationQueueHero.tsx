'use client';

import Link from 'next/link';
import { CheckCircle2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPendingQueueTitle } from '@/features/verification/utils/queueHero';

interface VerificationQueueHeroProps {
  pendingCount: number | null;
  /** Detail of the first pending exercise; without it the start action stays hidden. */
  startHref: string | null;
  testIdPrefix: string;
}

/** Pending count with the action that opens the queue; the main action of a verification list. */
export function VerificationQueueHero({ pendingCount, startHref, testIdPrefix }: VerificationQueueHeroProps) {
  if (pendingCount === null) {
    return <Skeleton className="h-[100px] w-full rounded-[20px]" />;
  }

  return (
    <section
      aria-label="Do weryfikacji"
      data-testid={`${testIdPrefix}-queue-hero`}
      className="flex flex-col gap-4 rounded-[20px] bg-surface-card p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      {pendingCount > 0 ? (
        <>
          <div className="flex items-center gap-5">
            <span className="text-5xl font-bold tabular-nums text-foreground">{pendingCount}</span>
            <span className="text-xl font-semibold text-foreground">{formatPendingQueueTitle(pendingCount)}</span>
          </div>
          {startHref && (
            <Button asChild size="lg" data-testid={`${testIdPrefix}-start-queue-btn`}>
              <Link href={startHref}>
                <Play className="fill-current" aria-hidden />
                Zacznij weryfikację
              </Link>
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="text-xl font-semibold text-foreground">Kolejka jest pusta</span>
            <span className="text-muted-foreground">
              Nowe ćwiczenia pojawią się tu, gdy autor wyśle je do weryfikacji.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
