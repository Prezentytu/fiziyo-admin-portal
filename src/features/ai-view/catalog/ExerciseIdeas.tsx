'use client';

import { useMemo } from 'react';
import { Lightbulb, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { aiVariantAttributes } from '@/features/exercises/utils/aiFullExercise';
import { useChatActions } from '../ChatSessionContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { useChatMode } from '../useChatMode';
import { freshIdeas } from '../utils/exerciseIdeas';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';
import { useExerciseIdeas } from './useExerciseIdeas';

/**
 * Ideas for new exercises when the catalog lacks what the therapist needs. Each idea opens the
 * exercise form with the AI proposal; the therapist checks it and adds it, nothing saves itself.
 */
export function ExerciseIdeasList({
  query,
  messageId,
  testId,
  catalogNames,
  disabled = false,
  offerOwn = true,
  showHeading = true,
}: {
  readonly query: string;
  readonly messageId: string;
  readonly testId: string;
  readonly catalogNames: readonly string[];
  readonly disabled?: boolean;
  /** Without ideas, offer one exercise under the asked name (off where the card already offers it). */
  readonly offerOwn?: boolean;
  /** Off in the ideas card, whose title already says it. */
  readonly showHeading?: boolean;
}) {
  const { appendExchange } = useChatActions();
  const { preference } = useChatMode();
  const state = useExerciseIdeas({ messageId, query, enabled: preference.useAi && !disabled });
  const ideas = useMemo(
    () => (state.status === 'ready' ? freshIdeas(state.ideas, catalogNames) : []),
    [state, catalogNames]
  );

  const create = (name: string) =>
    appendExchange(`Utwórz ćwiczenie: ${name}`, {
      text: 'Sprawdź propozycję, popraw, co trzeba, i dodaj ćwiczenie do katalogu gabinetu.',
      spec: { component: 'CreateExercise', name },
    });

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" className="flex flex-col gap-2" data-testid={`${testId}-loading`}>
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-14 rounded-[14px]" />
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    // Bez AI albo bez pomysłów zostaje to, o co pytano: jedno ćwiczenie pod tą nazwą.
    return query && offerOwn && !disabled ? (
      <Button variant="outline" className="self-start" onClick={() => create(query)} data-testid={`${testId}-own-btn`}>
        <Plus aria-hidden="true" />
        Utwórz ćwiczenie: {query}
      </Button>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {showHeading && <p className="text-[13px] font-medium text-label-secondary">Pomysły na nowe ćwiczenia</p>}
      <ul className="flex flex-col gap-2" data-testid={`${testId}-list`}>
        {ideas.map((idea, index) => {
          const attributes = aiVariantAttributes(idea);
          return (
            <li
              key={idea.name}
              className="flex items-center gap-3 rounded-[14px] bg-fill-quaternary px-3.5 py-2.5"
              data-testid={`${testId}-item-${index}`}
            >
              <Lightbulb className="h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] font-medium leading-[21px] text-foreground">{idea.name}</b>
                {attributes.length > 0 && (
                  <span className="block truncate text-[13px] text-label-secondary">{attributes.join(' · ')}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => create(idea.name)}
                data-testid={`${testId}-item-${index}-create-btn`}
              >
                <Plus aria-hidden="true" />
                Utwórz
              </Button>
            </li>
          );
        })}
      </ul>
      <ChatCardNote>Pomysły od AI. Ćwiczenie trafia do katalogu dopiero, gdy je sprawdzisz i dodasz.</ChatCardNote>
    </div>
  );
}

/** A local card: ideas for new exercises asked for from search results that do not fit. */
export function ExerciseIdeasCard({ spec, testId, messageId }: CardProps<'ExerciseIdeas'>) {
  const { organizationId } = useChatActions();
  const { exercises } = useAvailableExercises(organizationId, true);
  const catalogNames = useMemo(() => exercises.map((exercise) => exercise.name), [exercises]);
  return (
    <ChatCard testId={testId} title={`Nowe ćwiczenia: ${spec.query}`}>
      <ExerciseIdeasList
        query={spec.query}
        messageId={messageId}
        testId={`${testId}-ideas`}
        catalogNames={catalogNames}
        showHeading={false}
      />
    </ChatCard>
  );
}
