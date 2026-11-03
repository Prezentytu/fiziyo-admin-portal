'use client';

import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_INCREMENTAL_PAGE_SIZE = 60;

interface UseIncrementalListResult<T> {
  readonly visibleItems: readonly T[];
  readonly remaining: number;
  readonly showMore: () => void;
}

/**
 * Renderuje długą listę partiami (biblioteka ćwiczeń ma tysiące pozycji, a każda karta to obraz i menu).
 * Dane zostają w całości w pamięci, więc wyszukiwanie i filtry dalej działają na pełnej liście.
 *
 * `resetKey` zmieniaj przy nowym wyszukiwaniu albo filtrze; zmiana samych `items`
 * (np. realtime update) nie zwija listy pod przewijającym użytkownikiem.
 */
export function useIncrementalList<T>(
  items: readonly T[],
  resetKey: string,
  pageSize: number = DEFAULT_INCREMENTAL_PAGE_SIZE
): UseIncrementalListResult<T> {
  const [limit, setLimit] = useState(pageSize);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setLimit(pageSize);
  }

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);
  const showMore = useCallback(() => setLimit((current) => current + pageSize), [pageSize]);

  return {
    visibleItems,
    remaining: Math.max(items.length - limit, 0),
    showMore,
  };
}
