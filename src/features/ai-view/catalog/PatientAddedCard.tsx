'use client';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

const NEXT_STEPS = ['Ułóż zestaw', 'Skanuj wizytę', 'Później'] as const;

/** Stored result of the add-patient form, so a reload never shows the form again; then the next step. */
export function PatientAddedCard({ spec, testId, messageId, chosen }: CardProps<'PatientAdded'>) {
  const { appendExchange, markChosen } = useChatActions();
  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <p className="text-[16px] leading-[26px] text-foreground">
        Dodano: <b className="font-semibold">{spec.name}</b>. Co dalej?
      </p>
      <QuickReplies
        options={NEXT_STEPS}
        chosen={chosen}
        testId={testId}
        onPick={(option) => {
          markChosen(messageId, option);
          if (option === 'Ułóż zestaw') {
            appendExchange(option, {
              text: `Na jaki problem? Wybierz ćwiczenia z katalogu albo napisz, np. „${spec.name}, zestaw na kolano”.`,
              spec: { component: 'SetDraft', patientId: spec.patientId, exerciseIds: [] },
            });
          } else if (option === 'Skanuj wizytę') {
            appendExchange(option, {
              text: 'Dodaj notatkę z wizyty albo dokument z zaleceniami. Wyłuskam z nich ćwiczenia i ułożę zestaw.',
              spec: { component: 'ScanVisit', patientId: spec.patientId },
            });
          } else {
            appendExchange(option, { text: 'Dobrze. Pacjent jest na liście, wrócisz do niego, kiedy zechcesz.' });
          }
        }}
      />
    </div>
  );
}
