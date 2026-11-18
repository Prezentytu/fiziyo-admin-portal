'use client';

import { useMemo, useState } from 'react';
import { Check, Lightbulb, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import { buildExerciseImageUrls } from '@/components/shared/exercise/adapters';
import { cn } from '@/lib/utils';
import { useChatActions } from '../ChatSessionContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { pickExercisesById, searchExercises } from '../utils/exerciseLookup';
import { isExerciseTopic } from '../utils/threadLocalReply';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardEmpty } from './ChatCard';
import { ClarifyChips } from './ClarifyChips';
import { ExerciseIdeasList } from './ExerciseIdeas';
import { EXERCISE_CLARIFY_TOPICS } from '../utils/setDraft';

/** Search tiles: pick what fits and compose a set from it; when nothing fits, ideas for new exercises. */
export function ExerciseResultsCard({ spec, testId, messageId, chosen }: CardProps<'ExerciseResults'>) {
  const { organizationId, patients, appendExchange, markChosen } = useChatActions();
  // Model proponuje ćwiczenia z całego katalogu; te spoza pierwszej strony dociągają się po id (P-4).
  const { exercises, loading } = useAvailableExercises(organizationId, true, spec.exerciseIds);
  const patient = spec.patientId ? patients.find((candidate) => candidate.id === spec.patientId) : undefined;
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const results = useMemo(
    () =>
      spec.exerciseIds.length > 0
        ? pickExercisesById(exercises, spec.exerciseIds)
        : searchExercises(exercises, spec.query),
    [exercises, spec.exerciseIds, spec.query]
  );
  const selected = selectedIds ?? results.map((exercise) => exercise.id);
  const locked = chosen !== undefined;

  const toggle = (exerciseId: string) =>
    setSelectedIds(
      selected.includes(exerciseId) ? selected.filter((id) => id !== exerciseId) : [...selected, exerciseId]
    );

  const catalogNames = useMemo(() => exercises.map((exercise) => exercise.name), [exercises]);

  // Zapytanie, które jest zdaniem albo pytaniem, nie staje się nazwą ćwiczenia.
  const ownName = isExerciseTopic(spec.query) ? spec.query : undefined;
  const askForNew = () =>
    appendExchange(ownName ? `Utwórz ćwiczenie: ${ownName}` : 'Utwórz ćwiczenie', {
      text: 'Opisz ćwiczenie i ustaw podstawowe parametry, a dodam je do katalogu gabinetu.',
      spec: { component: 'CreateExercise', name: ownName },
    });

  const askForIdeas = () =>
    appendExchange(`Pomysły na nowe ćwiczenia: ${spec.query}`, {
      text: 'Tych ćwiczeń nie ma w katalogu. Wybierz pomysł, a przygotuję ćwiczenie do sprawdzenia.',
      spec: { component: 'ExerciseIdeas', query: spec.query, patientId: spec.patientId },
    });

  if (loading) {
    return (
      <ChatCard testId={testId} title="Szukam w katalogu">
        <div aria-busy="true" className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-24 rounded-[14px]" />
          ))}
        </div>
      </ChatCard>
    );
  }

  if (results.length === 0) {
    return (
      <ChatCard
        testId={testId}
        title={spec.query ? `Brak ćwiczeń: ${spec.query}` : 'Brak ćwiczeń'}
        footer={
          <>
            <span className="text-[13px] text-label-secondary">Albo dodaj ćwiczenie pod własną nazwą</span>
            <Button variant="outline" onClick={askForNew} data-testid={`${testId}-create-btn`}>
              <Plus aria-hidden="true" />
              Utwórz ćwiczenie
            </Button>
          </>
        }
      >
        <ChatCardEmpty testId={`${testId}-empty`}>W katalogu nie ma pasujących ćwiczeń.</ChatCardEmpty>
        <ExerciseIdeasList
          query={spec.query}
          messageId={messageId}
          testId={`${testId}-ideas`}
          catalogNames={catalogNames}
          offerOwn={false}
        />
      </ChatCard>
    );
  }

  return (
    <ChatCard
      testId={testId}
      title={spec.query ? `Ćwiczenia: ${spec.query}` : 'Ćwiczenia z katalogu'}
      meta={patient ? <span>dla: {patient.name}</span> : undefined}
      footer={
        locked ? (
          <span className="text-[13px] text-label-secondary">Wybrane ćwiczenia są w zestawie poniżej</span>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={askForIdeas}
              disabled={!spec.query}
              data-testid={`${testId}-ideas-btn`}
            >
              <Lightbulb aria-hidden="true" />
              Pomysły na nowe ćwiczenia
            </Button>
            <Button
              data-testid={`${testId}-primary-btn`}
              disabled={selected.length === 0}
              onClick={() => {
                markChosen(messageId, 'compose');
                appendExchange(`Ułóż zestaw z ${selected.length}`, {
                  text: 'Zestaw z wybranych ćwiczeń. Zmień parametry, zamień albo dodaj, co trzeba.',
                  spec: {
                    component: 'SetDraft',
                    patientId: patient?.id,
                    exerciseIds: selected,
                    note: spec.query || undefined,
                  },
                });
              }}
            >
              Ułóż zestaw ({selected.length})
            </Button>
          </>
        )
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
        {results.map((exercise) => {
          const isSelected = selected.includes(exercise.id);
          return (
            <li key={exercise.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={locked}
                onClick={() => toggle(exercise.id)}
                data-testid={`${testId}-item-${exercise.id}`}
                className={cn(
                  'relative flex h-full w-full min-w-0 flex-col gap-2 rounded-[14px] bg-fill-quaternary p-3.5 text-left ring-tint transition-shadow focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default',
                  isSelected && 'ring-2'
                )}
              >
                <ExerciseThumbnail
                  src={buildExerciseImageUrls(exercise)[0] ?? null}
                  sizeClass="h-10 w-10"
                  className="rounded-[10px]"
                />
                <span className="line-clamp-2 text-[15px] font-medium leading-[21px] text-foreground">
                  {exercise.name}
                </span>
                {isSelected && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-tint-fill text-on-tint">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!locked && (
        <ClarifyChips
          lead="Doprecyzuj, a dobiorę trafniej. Z wybranych ułożysz zestaw przyciskiem poniżej:"
          topics={EXERCISE_CLARIFY_TOPICS}
          testId={`${testId}-clarify`}
        />
      )}
    </ChatCard>
  );
}
