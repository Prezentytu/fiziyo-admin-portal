'use client';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { NewPatientForm } from './NewPatientForm';
import { useCreatePatient } from './useChatWrites';

/** New patient inline; the result goes into the thread as its own card, so the form never comes back. */
export function AddPatientCard({ spec, testId, messageId, chosen }: CardProps<'AddPatient'>) {
  const { organizationId, therapistId, appendAssistant, markChosen } = useChatActions();
  const { create, creating } = useCreatePatient();

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Pacjent dodany.
      </p>
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
          const patient = await create(organizationId, values, therapistId);
          if (!patient) return;
          markChosen(messageId, 'created');
          appendAssistant({ spec: { component: 'PatientAdded', patientId: patient.id, name: patient.name } });
        }}
      />
    </ChatCard>
  );
}
