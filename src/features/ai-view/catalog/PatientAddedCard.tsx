'use client';

import { useMeFeature } from '@/hooks/useMeFeature';

import { useChatActions } from '../ChatSessionContext';
import { SCAN_VISIT_FEATURE_FLAG } from '../useChatShortcuts';
import { scheduleQuestion } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

const ASSIGN_EXISTING_LABEL = 'Przypisz powyższy zestaw';
const NEXT_STEPS = ['Ułóż zestaw', 'Skanuj wizytę', 'Później'] as const;
const NEXT_STEPS_WITHOUT_SCAN = ['Ułóż zestaw', 'Później'] as const;

/** Stored result of the add-patient form, so a reload never shows the form again; then the next step. */
export function PatientAddedCard({ spec, testId, messageId, chosen }: CardProps<'PatientAdded'>) {
  const { appendExchange, markChosen } = useChatActions();
  const scanVisitEnabled = useMeFeature(SCAN_VISIT_FEATURE_FLAG);
  const baseSteps = scanVisitEnabled || chosen === 'Skanuj wizytę' ? NEXT_STEPS : NEXT_STEPS_WITHOUT_SCAN;
  const options = spec.pendingDraft ? [ASSIGN_EXISTING_LABEL, ...baseSteps] : baseSteps;
  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <p className="text-[16px] leading-[26px] text-foreground">
        Dodano: <b className="font-semibold">{spec.name}</b>.{' '}
        {spec.pendingDraft ? 'Przypisać przygotowany wyżej zestaw do tego pacjenta?' : 'Co dalej?'}
      </p>
      <QuickReplies
        options={options}
        chosen={chosen}
        testId={testId}
        onPick={(option) => {
          markChosen(messageId, option);
          if (option === ASSIGN_EXISTING_LABEL && spec.pendingDraft) {
            appendExchange(`${ASSIGN_EXISTING_LABEL}: ${spec.name}`, {
              text: scheduleQuestion(spec.pendingDraft),
              spec: { component: 'Schedule', draft: spec.pendingDraft },
            });
          } else if (option === 'Ułóż zestaw') {
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
