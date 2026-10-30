'use client';

import { Button } from '@/components/ui/button';
import { formatExerciseCount } from '@/utils/polishPlural';
import { toWizardPatient, useChatActions } from '../ChatActionsContext';
import type { ChatViewSpec } from '../utils/viewSpec';
import { ChatCard, ChatCardEmpty } from './ChatCard';

type AssignSummarySpec = Extract<ChatViewSpec, { component: 'AssignSummary' }>;

export function AssignSummaryCard({ spec, testId }: { readonly spec: AssignSummarySpec; readonly testId: string }) {
  const { patients, sets, openAssign } = useChatActions();
  const set = sets.find((candidate) => candidate.id === spec.setId);
  const patient = patients.find((candidate) => candidate.id === spec.patientId);

  if (!set) {
    return (
      <ChatCard testId={testId} title="Zestaw niedostępny">
        <ChatCardEmpty testId={`${testId}-empty`}>Nie widzę tego zestawu w Twojej organizacji.</ChatCardEmpty>
      </ChatCard>
    );
  }

  return (
    <ChatCard
      testId={testId}
      title="Gotowe do przypisania"
      badge={
        <span className="inline-flex h-[22px] items-center rounded-md bg-fill-tertiary px-2 text-[12px] font-semibold text-label-secondary">
          nie przypisano
        </span>
      }
      footer={
        <>
          <span className="text-[13px] text-label-secondary">Termin i rytm ustawisz w następnym kroku</span>
          <Button onClick={() => openAssign(set, toWizardPatient(patient))} data-testid={`${testId}-primary-btn`}>
            {patient ? `Przypisz: ${patient.name}` : 'Wybierz pacjenta'}
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[15px]">
        <dt className="text-label-secondary">Pacjent</dt>
        <dd className="font-medium text-foreground">{patient?.name ?? 'do wybrania'}</dd>
        <dt className="text-label-secondary">Zestaw</dt>
        <dd className="font-medium text-foreground">
          {set.name}, {formatExerciseCount(set.exerciseMappings?.length ?? 0)}
        </dd>
      </dl>
    </ChatCard>
  );
}
