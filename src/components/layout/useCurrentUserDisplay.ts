'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@apollo/client/react';

import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { getInitialsFromName } from '@/utils/textUtils';
import { getCompactDisplayName, resolveDisplayName } from './userDisplayName';

/** How the signed-in user is shown in account menus: backend profile first, Clerk as fallback. */
export function useCurrentUserDisplay() {
  const { user, isLoaded } = useUser();
  const { data } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const backendUser = data?.userByClerkId;
  const fullName =
    resolveDisplayName(backendUser?.fullname, backendUser?.personalData?.firstName, backendUser?.personalData?.lastName) ||
    resolveDisplayName(user?.fullName, user?.firstName, user?.lastName);
  const email = user?.primaryEmailAddress?.emailAddress || backendUser?.email || '';
  const displayName = fullName || email.split('@')[0] || 'Brak danych';

  return {
    isLoaded,
    avatarUrl: user?.imageUrl,
    email,
    displayName,
    compactDisplayName: getCompactDisplayName(displayName),
    initials: getInitialsFromName(displayName),
  };
}
