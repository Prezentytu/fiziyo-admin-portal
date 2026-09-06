'use client';

import { useClerk } from '@clerk/nextjs';
import { useCallback } from 'react';
import { clearBackendToken } from '@/lib/tokenCache';
import { disposeGraphqlWs } from '@/graphql/cache/wsRegistry';

/**
 * Jedyny poprawny sposób wylogowania w panelu webowym.
 *
 * Czyści backendowy JWT z cache PRZED wylogowaniem z Clerk. Bez tego token poprzedniego
 * użytkownika (np. fizjo) zostaje w sessionStorage i kolejny zalogowany użytkownik (np. pacjent)
 * dostaje powłokę UI poprzedniej roli, zanim Apollo zdąży wymienić token (privilege bleed).
 * Każdy przycisk "Wyloguj" MUSI używać tego hooka zamiast surowego `useClerk().signOut`.
 */
export function useAppSignOut() {
  const { signOut } = useClerk();

  return useCallback(
    async (redirectUrl: string = '/sign-in') => {
      clearBackendToken();
      disposeGraphqlWs();
      await signOut({ redirectUrl });
    },
    [signOut]
  );
}
