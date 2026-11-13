'use client';

import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

/** The value after it stopped changing for `delayMs`; an empty string applies at once (clearing a search). */
export function useDebouncedValue(value: string, delayMs: number = SEARCH_DEBOUNCE_MS): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const timer = setTimeout(() => setDebounced(value), value === '' ? 0 : delayMs);
    return () => clearTimeout(timer);
  }, [debounced, delayMs, value]);

  return debounced;
}
