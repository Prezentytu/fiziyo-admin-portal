'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * One write at a time: a call made while the previous one runs resolves to null without running.
 * A double click lands before a `disabled` state renders, so the guard is a ref, not state.
 */
export function useSingleFlight<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  const inFlightRef = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;
  const [pending, setPending] = useState(false);

  const run = useCallback(async (...args: Args): Promise<Result | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setPending(true);
    try {
      return await actionRef.current(...args);
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  }, []);

  return { run, pending };
}
