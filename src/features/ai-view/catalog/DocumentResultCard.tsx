'use client';

import { useState } from 'react';
import { Check, CircleHelp, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatActions } from '../ChatSessionContext';
import { documentDoses, itemExerciseId, matchedExerciseIds } from '../utils/documentItems';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardEmpty } from './ChatCard';

/**
 * What the document or note asks for, matched to the catalog. An uncertain match waits for "Tak";
 * missing exercises can be created here. The note's series and repetitions go into the draft.
 */
export function DocumentResultCard({ spec, testId, messageId, chosen }: CardProps<'DocumentResult'>) {
  const { appendExchange, markChosen } = useChatActions();
  const [confirmed, setConfirmed] = useState<ReadonlySet<number>>(() => new Set());
  const matchedIds = matchedExerciseIds(spec.items, confirmed);
  const locked = chosen !== undefined;
  const confirm = (index: number) => setConfirmed((previous) => new Set(previous).add(index));

  return (
    <ChatCard
      testId={testId}
      title={spec.fileName}
      footer={
        locked ? (
          <span className="text-[13px] text-label-secondary">Zestaw z dokumentu jest poniżej</span>
        ) : (
          <>
            <span className="text-[13px] text-label-secondary">Sprawdzisz i zmienisz przed wysłaniem</span>
            <Button
              disabled={matchedIds.length === 0}
              data-testid={`${testId}-primary-btn`}
              onClick={() => {
                markChosen(messageId, 'compose');
                appendExchange('Ułóż zestaw z dokumentu', {
                  text: 'Zestaw z pozycji, które są w katalogu. Serie i powtórzenia z notatki, reszta z katalogu; sprawdź przed wysłaniem.',
                  spec: {
                    component: 'SetDraft',
                    patientId: spec.patientId,
                    exerciseIds: matchedIds,
                    doses: documentDoses(spec.items, confirmed),
                  },
                });
              }}
            >
              Ułóż zestaw ({matchedIds.length})
            </Button>
          </>
        )
      }
    >
      {spec.items.length === 0 ? (
        <ChatCardEmpty testId={`${testId}-empty`}>Brak ćwiczeń w tym dokumencie.</ChatCardEmpty>
      ) : (
        <ul className="flex flex-col">
          {spec.items.map((item, index) => {
            const exerciseId = itemExerciseId(item, confirmed.has(index));
            const isUncertain = !exerciseId && item.suggestedExerciseId !== undefined;
            const catalogName = item.matchedName ?? (exerciseId ? item.suggestedName : undefined);
            return (
              <li
                key={`${item.name}-${index}`}
                className="flex min-h-12 items-center gap-3 border-t-[0.5px] border-hairline py-2 first:border-t-0"
              >
                <span
                  className={
                    exerciseId
                      ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-muted text-tint'
                      : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill-tertiary text-label-secondary'
                  }
                >
                  {exerciseId ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : isUncertain ? (
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground">{item.name}</span>
                  <span className="block truncate text-[13px] text-label-secondary">
                    {exerciseId
                      ? `w katalogu: ${catalogName ?? item.name}`
                      : isUncertain
                        ? `czy chodziło o: ${item.suggestedName}?`
                        : 'brak w katalogu'}
                  </span>
                </span>
                {isUncertain && !locked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirm(index)}
                    data-testid={`${testId}-confirm-${index}-btn`}
                  >
                    Tak
                  </Button>
                )}
                {!exerciseId && !locked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendExchange(`Utwórz ćwiczenie: ${item.name}`, {
                        text: 'Uzupełnij opis i parametry, a dodam ćwiczenie do katalogu.',
                        spec: { component: 'CreateExercise', name: item.name, description: item.description },
                      })
                    }
                    data-testid={`${testId}-create-${index}-btn`}
                  >
                    Utwórz
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ChatCard>
  );
}
