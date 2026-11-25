'use client';

import { useQuery } from '@apollo/client/react';

import { ReviewNotesPanel } from '@/features/verification/ReviewNotesPanel';
import { GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY } from '@/graphql/queries/exerciseReviewNotes.queries';
import type { GetExerciseReviewLogAccessResponse } from '@/graphql/types/exerciseReviewNote.types';

import { ExerciseReviewThread } from './ExerciseReviewThread';

const EXERCISE_PAGE_CONTEXT = { key: 'exercise', label: 'Strona ćwiczenia' };

/**
 * One place for text about the exercise on its page (BW-FZ-125). Reviewers (FiziYo team, clinic owner or admin)
 * get the same log panel as in verification, read plus adding notes; the author and therapists get their view
 * of the notes meant for them. A clinic owner or admin also gets the author's view of their catalog submission. The level comes from the backend, never from a guessed role.
 */
export function ExerciseReviewLogSection({ exerciseId }: Readonly<{ exerciseId: string }>) {
  const { data } = useQuery<GetExerciseReviewLogAccessResponse>(GET_EXERCISE_REVIEW_LOG_ACCESS_QUERY, {
    variables: { exerciseId },
    skip: !exerciseId,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });
  const access = data?.exerciseReviewLogAccess;
  if (!access || access.level === 'NONE') return null;
  if (access.level === 'TEAM') {
    return <ReviewNotesPanel exerciseId={exerciseId} context={EXERCISE_PAGE_CONTEXT} variant="inline" />;
  }
  if (access.level === 'ORG_REVIEWER') {
    // The owner's own catalog submission comes back to them as to an author; they answer it below the panel.
    return (
      <>
        <ReviewNotesPanel exerciseId={exerciseId} context={EXERCISE_PAGE_CONTEXT} variant="inline" />
        <ExerciseReviewThread exerciseId={exerciseId} access={access} catalogSubmissionOnly />
      </>
    );
  }
  return <ExerciseReviewThread exerciseId={exerciseId} access={access} />;
}
