/**
 * Sortowanie i zakres dat kolejek weryfikacji (T-0024).
 *
 * Backend (`VerificationQueueOrdering`) sortuje i filtruje po dacie kolejki: zgłoszenia, oceny albo ostatniej
 * zmiany, zależnie od filtra. `dateFrom` jest włącznie, `dateTo` wyłącznie, oba w UTC. W URL trzymamy dni
 * kalendarza `YYYY-MM-DD` w strefie użytkownika i dopiero tu zamieniamy je na granice w UTC.
 */

import type { VerificationQueueOrderingVariables, VerificationQueueSort } from '@/graphql/types/adminExercise.types';

export interface VerificationQueueOrdering {
  sort: VerificationQueueSort;
  /** Pierwszy dzień zakresu (`YYYY-MM-DD`, strefa użytkownika) albo pusty. */
  dateFrom: string;
  /** Ostatni dzień zakresu, włącznie (`YYYY-MM-DD`, strefa użytkownika) albo pusty. */
  dateTo: string;
}

export const DEFAULT_QUEUE_ORDERING: VerificationQueueOrdering = { sort: 'NEWEST', dateFrom: '', dateTo: '' };

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Dzień kalendarza z URL albo pole daty; inny tekst (także nieistniejąca data) daje pusty string. */
export function parseQueueDay(value: string | null | undefined): string {
  const match = value ? DAY_PATTERN.exec(value) : null;
  if (!match) return '';
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value! : '';
}

export function parseVerificationQueueSort(value: string | null | undefined): VerificationQueueSort {
  return value === 'oldest' || value === 'OLDEST' ? 'OLDEST' : 'NEWEST';
}

export function parseQueueOrdering(params: Pick<URLSearchParams, 'get'>): VerificationQueueOrdering {
  return {
    sort: parseVerificationQueueSort(params.get('sort')),
    dateFrom: parseQueueDay(params.get('from')),
    dateTo: parseQueueDay(params.get('to')),
  };
}

/** Dopisuje do parametrów listy tylko to, co odbiega od domyślnych, żeby stare linki zostały bez zmian. */
export function appendQueueOrderingParams(
  params: URLSearchParams,
  ordering: Partial<VerificationQueueOrdering> | undefined
): URLSearchParams {
  if (!ordering) return params;
  if (ordering.sort === 'OLDEST') params.set('sort', 'oldest');
  const from = parseQueueDay(ordering.dateFrom);
  const to = parseQueueDay(ordering.dateTo);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params;
}

/** Północ dnia `YYYY-MM-DD` w strefie użytkownika, przesunięta o `offsetDays`, jako ISO w UTC. */
function localMidnightIso(day: string, offsetDays: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date + offsetDays).toISOString();
}

export function queueOrderingVariables(ordering: VerificationQueueOrdering): VerificationQueueOrderingVariables {
  const variables: VerificationQueueOrderingVariables = {};
  if (ordering.sort === 'OLDEST') variables.sort = 'OLDEST';
  const from = parseQueueDay(ordering.dateFrom);
  const to = parseQueueDay(ordering.dateTo);
  if (from) variables.dateFrom = localMidnightIso(from, 0);
  // Ostatni dzień zakresu liczy się w całości: granica to północ dnia następnego (backend: wyłącznie).
  if (to) variables.dateTo = localMidnightIso(to, 1);
  return variables;
}

export function isDefaultQueueOrdering(ordering: VerificationQueueOrdering): boolean {
  return ordering.sort === 'NEWEST' && !parseQueueDay(ordering.dateFrom) && !parseQueueDay(ordering.dateTo);
}

export type VerificationQueueScope = 'global' | 'organization';

/**
 * Po jakiej dacie kolejka sortuje i filtruje, tak jak `GlobalQueueDate` i `OrganizationQueueDate` w backendzie.
 * Etykieta mówi terapeucie, co oznacza zakres, zamiast ogólnego „data”.
 */
export function queueDateLabel(scope: VerificationQueueScope, filter: string): string {
  if (scope === 'global') return filter === 'changes' ? 'Data zmiany' : 'Data dodania';
  if (filter === 'pending') return 'Data zgłoszenia';
  if (filter === 'changes' || filter === 'verified') return 'Data oceny';
  return 'Data zmiany';
}
