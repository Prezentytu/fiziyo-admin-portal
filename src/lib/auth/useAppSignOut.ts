'use client';

import { useClerk } from '@clerk/nextjs';
import { useCallback } from 'react';
import { clearBackendToken } from '@/lib/tokenCache';
import { clearUserBrowserState } from '@/lib/auth/userBrowserState';
import { setTelemetryUser } from '@/lib/telemetry/client';

/**
 * The only correct way to sign out in the web portal (lint blocks Clerk's raw `signOut`).
 *
 * Before leaving we clear the backend JWT (otherwise the next user gets the previous role's shell)
 * and localStorage with the chosen organization, builder cart and chat conversations.
 * Tab memory (Apollo cache, subscription socket) is cleared by ApolloWrapper on `userId` change,
 * because that change also arrives without this hook: session expiry, sign-out in another tab.
 */
export function useAppSignOut() {
  // eslint-disable-next-line no-restricted-syntax -- the only place that calls Clerk's signOut.
  const { signOut } = useClerk();

  return useCallback(
    async (redirectUrl: string = '/sign-in') => {
      clearBackendToken();
      clearUserBrowserState();
      setTelemetryUser(null);
      await signOut({ redirectUrl });
    },
    [signOut]
  );
}
