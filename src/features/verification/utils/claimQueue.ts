/**
 * „Weź N” w kolejce globalnej (SPEC-041): porcje, dostępność przycisków i komunikat po wzięciu.
 */

import type { VerificationQueueSort } from '@/graphql/types/adminExercise.types';
import { formatExerciseCount } from '@/utils/polishPlural';

/** Dzienne porcje: 10–100 ćwiczeń, jak dzielą pracę weryfikatorzy. Backend przyjmuje do 100. */
export const CLAIM_BATCH_SIZES = [10, 25, 50, 100] as const;

export interface MyQueueProgress {
  assignedToMe: number;
  unassignedPending: number;
  decidedTodayByMe: number;
}

/** Liczniki z `verificationStats`; brak pola (starszy backend) to zero, nie błąd. */
export function readMyQueueProgress(stats: Partial<MyQueueProgress> | null | undefined): MyQueueProgress {
  return {
    assignedToMe: stats?.assignedToMe ?? 0,
    unassignedPending: stats?.unassignedPending ?? 0,
    decidedTodayByMe: stats?.decidedTodayByMe ?? 0,
  };
}

export function claimEndLabel(sort: VerificationQueueSort): string {
  return sort === 'OLDEST' ? 'od najstarszych' : 'od najnowszych';
}

/** Komunikat po „Weź N”: ile wzięto i dlaczego mniej, niż proszono. */
export function claimResultMessage(
  claimed: number,
  requested: number,
  sort: VerificationQueueSort
): { tone: 'success' | 'info'; text: string } {
  if (claimed === 0) return { tone: 'info', text: 'Nie ma już wolnych ćwiczeń w tej kolejce.' };
  const taken = `Wzięto ${formatExerciseCount(claimed)} ${claimEndLabel(sort)}`;
  if (claimed < requested) return { tone: 'info', text: `${taken}. Więcej wolnych nie było.` };
  return { tone: 'success', text: `${taken}.` };
}
