'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';

import { MARK_RELEASE_NOTE_SEEN_MUTATION } from '@/graphql/mutations/releaseNotes.mutations';
import { GET_UNSEEN_RELEASE_NOTE_QUERY } from '@/graphql/queries/releaseNotes.queries';
import type {
  GetUnseenReleaseNoteResponse,
  MarkReleaseNoteSeenResponse,
  MarkReleaseNoteSeenVariables,
  ReleaseNote,
} from '@/graphql/types';
import { UNSEEN_RELEASE_NOTE_POLL_MS } from './utils/releaseNotes';

/**
 * Newest published release the user has not seen yet. Menu, settings, banner and bell share one cached query;
 * an error (e.g. an API without release notes) hides the feature instead of breaking the shell.
 */
export function useUnseenReleaseNote(): ReleaseNote | null {
  const { data } = useQuery<GetUnseenReleaseNoteResponse>(GET_UNSEEN_RELEASE_NOTE_QUERY, {
    fetchPolicy: 'cache-first',
    pollInterval: UNSEEN_RELEASE_NOTE_POLL_MS,
    skipPollAttempt: () => document.hidden,
    errorPolicy: 'all',
  });
  return data?.unseenReleaseNote ?? null;
}

/** Marks a release as seen and refreshes every `unseenReleaseNote` reader; failures stay silent (retry on next visit). */
export function useMarkReleaseNoteSeen(): (releaseNoteId: string) => void {
  const [mutate] = useMutation<MarkReleaseNoteSeenResponse, MarkReleaseNoteSeenVariables>(
    MARK_RELEASE_NOTE_SEEN_MUTATION,
    {
      refetchQueries: ['GetUnseenReleaseNote'],
      onError: () => undefined,
    }
  );

  return useCallback((releaseNoteId: string) => void mutate({ variables: { releaseNoteId } }), [mutate]);
}
