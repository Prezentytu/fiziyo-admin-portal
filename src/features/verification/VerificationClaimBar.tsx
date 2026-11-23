'use client';

import { Loader2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { VerificationProgress, VerificationQueueSort } from '@/graphql/types/adminExercise.types';
import { cn } from '@/lib/utils';

import { CLAIM_BATCH_SIZES, claimEndLabel } from './utils/claimQueue';

interface VerificationClaimBarProps {
  readonly progress: VerificationProgress;
  readonly sort: VerificationQueueSort;
  readonly onClaim: (count: number) => void;
  readonly onShowMine: () => void;
  readonly claimingCount: number | null;
  readonly className?: string;
}

/**
 * Moja kolejka w „Do sprawdzenia” (SPEC-041): ile mam, ile jest wolnych, ile zrobiłem dziś, i „Weź N”
 * z końca kolejki wybranego w sortowaniu.
 */
export function VerificationClaimBar({
  progress,
  sort,
  onClaim,
  onShowMine,
  claimingCount,
  className,
}: VerificationClaimBarProps) {
  const nothingFree = progress.unassignedPending === 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface p-3',
        className
      )}
      data-testid="verification-claim-bar"
    >
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Moje</dt>
          <dd>
            <button
              type="button"
              onClick={onShowMine}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
              data-testid="verification-progress-mine"
            >
              {progress.assignedToMe}
            </button>
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Wolne</dt>
          <dd className="font-semibold text-foreground" data-testid="verification-progress-free">
            {progress.unassignedPending}
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Dziś zrobione</dt>
          <dd className="font-semibold text-primary" data-testid="verification-progress-today">
            {progress.decidedTodayByMe}
          </dd>
        </div>
      </dl>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={`Weź do siebie ${claimEndLabel(sort)}`}
      >
        <span className="text-xs text-muted-foreground">Weź {claimEndLabel(sort)}</span>
        {CLAIM_BATCH_SIZES.map((count) => (
          <Button
            key={count}
            variant="outline"
            size="sm"
            onClick={() => onClaim(count)}
            disabled={nothingFree || claimingCount !== null}
            className="gap-1.5"
            aria-label={`Weź ${count} ${claimEndLabel(sort)}`}
            data-testid={`verification-claim-${count}`}
          >
            {claimingCount === count ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {count}
          </Button>
        ))}
      </div>
    </div>
  );
}
