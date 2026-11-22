'use client';

import { useEffect, useRef } from 'react';

interface ResetOnUserChangeInput {
  /** Clerk `userId`; `null` after sign-out, `undefined` while Clerk is loading. */
  userId: string | null | undefined;
  isLoaded: boolean;
  /** Called when the person in this tab changes (sign-out, another account, sign-out in another tab). */
  onUserChange: (previousUserId: string | null) => void;
}

/**
 * Clerk switches users without a page reload, so tab memory (Apollo cache, subscription socket)
 * would survive a change of person. The first known value after loading is the baseline.
 */
export function useResetOnUserChange({ userId, isLoaded, onUserChange }: ResetOnUserChangeInput): void {
  const knownUserId = useRef<string | null | undefined>(undefined);
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    const previous = knownUserId.current;
    knownUserId.current = current;
    if (previous !== undefined && previous !== current) onUserChangeRef.current(previous);
  }, [isLoaded, userId]);
}
