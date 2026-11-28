'use client';

import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { NewPatientForm } from './NewPatientForm';
import { useCreatePatient } from './useChatWrites';

/** New patient inline; the result goes into the thread as its own card, so the form never comes back. */
export function AddPatientCard({ spec, testId, messageId, chosen }: CardProps<'AddPatient'>) {
  const { organizationId, therapistId, appendAssistant, continueForPatient, markChosen, getOpenUnassignedDraft } =
    useChatActions();
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
        defaults={{ phone: spec.phone, email: spec.email, contextLabel: spec.contextLabel }}
        submitLabel="Dodaj pacjenta"
        busy={creating}
        onSubmit={async (values) => {
          const patient = await create(organizationId, values, therapistId);
          if (!patient) return;
          markChosen(messageId, 'created');
          // Prośba łączona („… i ułóż mu zestaw”): reszta idzie dalej od razu, dla tego pacjenta.
          if (spec.then) {
            continueForPatient(patient.id, patient.name, spec.then);
            return;
          }
          // SPEC-068 (W3): jeśli w wątku wisi już nieprzypisany szkic zestawu, daj go podpiąć jednym kliknięciem.
          const openDraft = getOpenUnassignedDraft();
          if (openDraft) {
            markChosen(openDraft.messageId, 'next');
            appendAssistant({
              spec: {
                component: 'PatientAdded',
                patientId: patient.id,
                name: patient.name,
                pendingDraft: { ...openDraft.draft, patientId: patient.id },
              },
            });
            return;
          }
          appendAssistant({ spec: { component: 'PatientAdded', patientId: patient.id, name: patient.name } });
        }}
      />
    </ChatCard>
  );
}
