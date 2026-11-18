'use client';

import Link from 'next/link';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { draftWithExercise } from '../utils/addToDraft';
import { QuickReplies } from './QuickReplies';

const NEXT_STEPS = ['Dodaj do zestawu', 'Gotowe'] as const;

/** Stored result of the create-exercise form, so a reload never offers to create it twice. */
export function ExerciseCreatedCard({ spec, testId, messageId, chosen }: CardProps<'ExerciseCreated'>) {
  const { appendExchange, markChosen } = useChatActions();
  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <p className="text-[16px] leading-[26px] text-foreground">
        Ćwiczenie <b className="font-semibold">{spec.name}</b> jest w katalogu gabinetu. Zdjęcie i szczegóły dodasz na{' '}
        <Link href={`/exercises/${spec.exerciseId}`} className="text-tint" data-testid={`${testId}-open-link`}>
          stronie ćwiczenia
        </Link>
        .
      </p>
      <QuickReplies
        options={NEXT_STEPS}
        chosen={chosen}
        testId={testId}
        onPick={(option) => {
          markChosen(messageId, option);
          if (option === 'Dodaj do zestawu') {
            // Ćwiczenie utworzone z propozycji zestawu wraca do tej propozycji, z jej parametrami.
            const back = spec.addToSet;
            appendExchange(option, {
              text: back
                ? 'Nowe ćwiczenie jest w zestawie. Sprawdź całość i przejdź dalej.'
                : 'Zestaw z nowym ćwiczeniem. Dodaj kolejne z katalogu albo przejdź dalej.',
              spec: back
                ? draftWithExercise(back, spec.exerciseId)
                : { component: 'SetDraft', patientId: spec.patientId, exerciseIds: [spec.exerciseId] },
            });
          } else {
            appendExchange(option, { text: 'Dobrze. Ćwiczenie znajdziesz w katalogu.' });
          }
        }}
      />
    </div>
  );
}
