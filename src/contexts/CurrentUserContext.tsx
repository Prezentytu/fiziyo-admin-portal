'use client';

import { createContext, useContext, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from '@apollo/client/react';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { User, UserByClerkIdResponse } from '@/types/apollo';

interface CurrentUserContextValue {
  user: User | null;
  clerkId: string | undefined;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { data, loading, refetch } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id || '' },
    skip: !clerkUser?.id,
  });

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user: data?.userByClerkId ?? null,
      clerkId: clerkUser?.id,
      isLoading: !isLoaded || loading,
      refetch,
    }),
    [clerkUser?.id, data?.userByClerkId, isLoaded, loading, refetch]
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return context;
}

export function useOptionalCurrentUser(): CurrentUserContextValue | null {
  return useContext(CurrentUserContext);
}
