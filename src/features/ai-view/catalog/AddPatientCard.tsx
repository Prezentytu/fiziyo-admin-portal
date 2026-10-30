'use client';

import { useState } from 'react';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { NewPatientForm } from './NewPatientForm';
import { QuickReplies } from './QuickReplies';
import { useCreatePatient } from './useChatWrites';

const NEXT_STEPS = ['Ułóż zestaw', 'Skanuj wizytę', 'Później'] as const;

/** New patient inline, then the next step the design offers: a set, a visit scan, or nothing now. */
export function AddPatientCard({ spec, testId, messageId, chosen }: CardProps<'AddPatient'>) {
  const { organizationId, appendExchange, markChosen } = useChatActions();
  const { create, creating } = useCreatePatient();
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  if (!created && chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Pacjent dodany. Wybrano: {chosen}
      </p>
    );
  }

  if (created) {
    return (
      <div data-testid={testId} className="flex flex-col gap-3">
        <p className="text-[16px] leading-[26px] text-foreground">
          Dodano: <b className="font-semibold">{created.name}</b>. Co dalej?
        </p>
        <QuickReplies
          options={NEXT_STEPS}
          chosen={chosen}
          testId={testId}
          onPick={(option) => {
            markChosen(messageId, option);
            if (option === 'Ułóż zestaw') {
              appendExchange(option, {
                text: `Na jaki problem? Wybierz ćwiczenia z katalogu albo napisz, np. „${created.name}, zestaw na kolano”.`,
                spec: { component: 'SetDraft', patientId: created.id, exerciseIds: [] },
              });
            } else if (option === 'Skanuj wizytę') {
              appendExchange(option, {
                text: 'Dodaj notatkę z wizyty albo dokument z zaleceniami. Wyłuskam z nich ćwiczenia i ułożę zestaw.',
                spec: { component: 'ScanVisit', patientId: created.id },
              });
            } else {
              appendExchange(option, { text: 'Dobrze. Pacjent jest na liście, wrócisz do niego, kiedy zechcesz.' });
            }
          }}
        />
      </div>
    );
  }

  return (
    <ChatCard testId={testId} title="Nowy pacjent">
      <NewPatientForm
        testId={`${testId}-new`}
        defaultName={spec.name}
        submitLabel="Dodaj pacjenta"
        busy={creating}
        onSubmit={async (values) => {
          const patient = await create(organizationId, values);
          if (patient) setCreated(patient);
        }}
      />
    </ChatCard>
  );
}
