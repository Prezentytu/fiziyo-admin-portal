/**
 * Zapamiętana kolejka weryfikatora: kolejność i filtr przypisania z ostatniej pracy na liście globalnej.
 *
 * Dwóch weryfikatorów dzieli kolejkę z dwóch końców (jeden od najnowszych, drugi od najstarszych), więc każdy
 * wraca na listę bez linku z parametrami i powinien zobaczyć swój koniec kolejki, nie domyślny. Link z jawnym
 * `sort` albo `assignee` wygrywa z zapamiętanym ustawieniem. Zakres dat nie jest zapamiętywany: to zawężenie
 * na jedną sesję, a zapomniany filtr dat chowałby resztę kolejki.
 */

import type { VerificationQueueSort } from '@/graphql/types/adminExercise.types';
import { parseVerificationQueueSort } from './queueOrdering';
import { parseReviewAssigneeFilter, type ReviewAssigneeFilter } from './reviewNotes';

export const QUEUE_PREFERENCES_KEY = 'fizyo_verification_queue';

export interface VerificationQueuePreferences {
  sort: VerificationQueueSort;
  assignee: ReviewAssigneeFilter;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readQueuePreferences(storage?: ReadableStorage): VerificationQueuePreferences | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(QUEUE_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { sort, assignee } = parsed as Record<string, unknown>;
    return {
      sort: parseVerificationQueueSort(typeof sort === 'string' ? sort : null),
      assignee: parseReviewAssigneeFilter(typeof assignee === 'string' ? assignee : null),
    };
  } catch {
    return null;
  }
}

export function writeQueuePreferences(preferences: VerificationQueuePreferences, storage?: WritableStorage): void {
  try {
    (storage ?? window.localStorage).setItem(QUEUE_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Tryb prywatny albo pełna pamięć: lista działa dalej, tylko bez zapamiętania.
  }
}

/**
 * Co przywrócić przy wejściu na listę: zapamiętane ustawienie tylko wtedy, gdy link nie niesie ani `sort`,
 * ani `assignee`, i tylko gdy różni się od tego, co lista już pokazuje. `null` znaczy: nic nie zmieniaj.
 */
export function preferencesToRestore(
  params: Pick<URLSearchParams, 'has'>,
  current: VerificationQueuePreferences,
  stored: VerificationQueuePreferences | null
): VerificationQueuePreferences | null {
  if (!stored || params.has('sort') || params.has('assignee')) return null;
  if (stored.sort === current.sort && stored.assignee === current.assignee) return null;
  return stored;
}
