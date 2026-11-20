'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY } from '@/graphql/queries/exercises.queries';
import { useExercisePickerPages } from '@/hooks/useExercisePickerPages';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { exerciseFormFromDiscussion, type ExerciseDiscussion } from '../utils/exerciseDiscussion';
import { pickExercisesById, type SearchableExercise } from '../utils/exerciseLookup';
import type { CardProps } from './cardProps';
import { ExerciseIdeasList } from './ExerciseIdeas';
import { ChatCard, ChatCardNote } from './ChatCard';

interface VisibleRecords {
  firstWindow?: SearchableExercise[];
  secondWindow?: SearchableExercise[];
}

export function ExerciseDiscussionCard({
  spec,
  discussion,
  testId,
  messageId,
  chosen,
}: CardProps<'CreateExercise'> & { discussion: ExerciseDiscussion }) {
  const { organizationId, appendExchange, markChosen } = useChatActions();
  const busy = useChatBusy();
  const disabled = chosen !== undefined || busy;
  const { ids, search } = discussion;
  // By-ID detail reads also include hidden records. Verify model suggestions through the visible library.
  const records = useQuery<VisibleRecords>(GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY, {
    variables: { organizationId, ids },
    skip: !organizationId || !ids.length,
    fetchPolicy: 'cache-and-network',
  });
  const matches = pickExercisesById([...(records.data?.firstWindow ?? []), ...(records.data?.secondWindow ?? [])], ids);
  const searchLibrary =
    !!organizationId && !!search && !matches.length && !(ids.length && records.loading) && !discussion.selected;
  const page = useExercisePickerPages<SearchableExercise>({
    organizationId,
    search,
    sourceFilter: 'all',
    skip: !searchLibrary,
  });
  const items = matches.length ? matches : searchLibrary ? page.items : [];
  const loading = !items.length && ((ids.length > 0 && records.loading) || (searchLibrary && page.loading));
  const failed = !items.length && (!organizationId || (searchLibrary ? page.error : ids.length && records.error));

  function create(name?: string) {
    markChosen(messageId, 'create');
    appendExchange(name ? `Utwórz ćwiczenie: ${name}` : 'Utwórz własne ćwiczenie', {
      spec: name
        ? { component: 'CreateExercise', name, ...(spec.offerForSet && { offerForSet: spec.offerForSet }) }
        : exerciseFormFromDiscussion(spec),
    });
  }

  function discuss(exercise: SearchableExercise) {
    const choice = `Omów ćwiczenie „${exercise.name}”`;
    markChosen(messageId, choice);
    appendExchange(choice, {
      spec: {
        ...spec,
        discussion: { ...discussion, topic: `${discussion.topic}\n${choice}`, ids: [exercise.id], selected: true },
      },
      text: 'Co chcesz omówić w tym ćwiczeniu?',
    });
  }

  return (
    <ChatCard
      testId={testId}
      title={discussion.selected ? 'Wybrane ćwiczenie' : 'Ćwiczenia dostępne w katalogu'}
      footer={
        <Button variant="outline" disabled={disabled} onClick={() => create()} data-testid={`${testId}-create-btn`}>
          Utwórz własne ćwiczenie
        </Button>
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 4).map((exercise) => (
            <li key={exercise.id} className="flex flex-col items-start gap-1">
              {discussion.selected ? (
                <Link
                  className="font-medium text-tint"
                  href={`/exercises/${exercise.id}`}
                  data-testid={`${testId}-details-link`}
                >
                  {exercise.name}
                </Link>
              ) : (
                <Button
                  variant="link"
                  className="h-auto whitespace-normal p-0 text-left"
                  disabled={disabled}
                  onClick={() => discuss(exercise)}
                  data-testid={`${testId}-discuss-${exercise.id}-btn`}
                >
                  {exercise.name}
                </Button>
              )}
              <p className="text-sm text-label-secondary">
                {exercise.patientDescription || exercise.clinicalDescription}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ChatCardNote>
          {loading
            ? 'Szukam w katalogu…'
            : failed
              ? 'Nie udało się wczytać katalogu.'
              : discussion.selected
                ? 'To ćwiczenie jest już niedostępne.'
                : search
                  ? 'Brak dopasowań w katalogu. Możesz przygotować nowe ćwiczenie.'
                  : 'Podaj nazwę ruchu lub okolicę ciała, żeby sprawdzić katalog.'}
        </ChatCardNote>
      )}
      {searchLibrary && !loading && !failed && !items.length && (
        <ExerciseIdeasList
          query={spec.name || search}
          messageId={messageId}
          testId={`${testId}-ideas`}
          catalogNames={[]}
          offerOwn={false}
          disabled={disabled}
          onCreate={create}
        />
      )}
    </ChatCard>
  );
}
