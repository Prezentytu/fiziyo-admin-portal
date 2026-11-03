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
    return <Skeleton className="h-14 w-full rounded-xl" />;
  }

  return (
    <section
      aria-label="Do weryfikacji"
      data-testid={`${testIdPrefix}-queue-hero`}
      className="flex flex-col gap-3 rounded-xl bg-surface-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      {pendingCount > 0 ? (
        <>
          <p className="text-[15px] text-foreground">
            <span className="font-semibold tabular-nums">{pendingCount}</span> {formatPendingQueueTitle(pendingCount)}
          </p>
          {startHref && (
            <Button asChild data-testid={`${testIdPrefix}-start-queue-btn`}>
              <Link href={startHref}>
                <Play className="fill-current" aria-hidden />
                Zacznij weryfikację
              </Link>
            </Button>
          )}
        </>
      ) : (
        <p className="flex items-center gap-2 text-[15px] text-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Kolejka jest pusta
        </p>
      )}
    </section>
  );
}
