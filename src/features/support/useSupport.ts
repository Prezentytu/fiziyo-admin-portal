'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';

import { SUPPORT_MARK_READ_MUTATION } from '@/graphql/mutations/support.mutations';
import { GET_SUPPORT_UNREAD_COUNT_QUERY } from '@/graphql/queries/support.queries';
import type {
  GetSupportUnreadCountResponse,
  SupportMarkReadResponse,
  SupportMarkReadVariables,
  SupportUnreadCount,
} from '@/graphql/types';
import { SUPPORT_POLL_MS } from './utils/support';

/**
 * Licznik Wsparcia współdzielony przez ikonę, dzwonek, baner i zakładki. Błąd albo API bez Wsparcia ukrywa funkcję,
 * zamiast psuć nagłówek; `enabled` to flaga `supportInbox` z Ops.
 */
export function useSupportUnreadCount(): SupportUnreadCount | null {
  const { data } = useQuery<GetSupportUnreadCountResponse>(GET_SUPPORT_UNREAD_COUNT_QUERY, {
    fetchPolicy: 'cache-first',
    pollInterval: SUPPORT_POLL_MS,
    skipPollAttempt: () => document.hidden,
    errorPolicy: 'all',
  });
  return data?.supportUnreadCount ?? null;
}

/** Oznacza wątek jako przeczytany i odświeża licznik oraz listy; błąd jest cichy (ponowimy przy następnym wejściu). */
export function useMarkSupportThreadRead(): (threadId: string) => void {
  const [mutate] = useMutation<SupportMarkReadResponse, SupportMarkReadVariables>(SUPPORT_MARK_READ_MUTATION, {
    refetchQueries: ['GetSupportUnreadCount', 'GetSupportThreads'],
    onError: () => undefined,
  });
  return useCallback((threadId: string) => void mutate({ variables: { threadId } }), [mutate]);
}
