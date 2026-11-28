'use client';

import Link from 'next/link';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { afterExerciseChoice, EXERCISE_NEXT_STEPS } from '../utils/addToDraft';
import { QuickReplies } from './QuickReplies';

/** Stored result of the create-exercise form, so a reload never offers to create it twice. */
export function ExerciseCreatedCard({ spec, testId, messageId, chosen }: CardProps<'ExerciseCreated'>) {
  const { appendExchange, markChosen } = useChatActions();
  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <p className="text-[16px] leading-[26px] text-foreground">
        {spec.hasImage ? (
          <>
            Ćwiczenie <b className="font-semibold">{spec.name}</b> jest w katalogu gabinetu (z wygenerowaną grafiką).
            Szczegóły i film możesz edytować na{' '}
          </>
        ) : (
          <>
            Ćwiczenie <b className="font-semibold">{spec.name}</b> jest w katalogu gabinetu. Zdjęcie i szczegóły dodasz
            na{' '}
          </>
        )}
        <Link href={`/exercises/${spec.exerciseId}`} className="text-tint" data-testid={`${testId}-open-link`}>
          stronie ćwiczenia
        </Link>
        .
      </p>
      <p>Czy dodać to ćwiczenie do zestawu?</p>
      <QuickReplies
        options={EXERCISE_NEXT_STEPS}
        chosen={chosen}
        testId={testId}
        onPick={(_, index) => {
          const option = EXERCISE_NEXT_STEPS[index];
          markChosen(messageId, option);
          appendExchange(option, afterExerciseChoice(spec, option));
        }}
      />
    </div>
  );
}
