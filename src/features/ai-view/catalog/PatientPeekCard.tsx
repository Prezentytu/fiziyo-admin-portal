'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ActivityStatusLabel, InitialsAvatar } from '@/components/shared/page';
import {
  comparePatientsByAttention,
  getPatientActivityStatus,
  needsAttention,
} from '@/features/patients/utils/patientActivityStatus';
import { polishPlural } from '@/utils/polishPlural';
import { toWizardPatient, useChatActions } from '../ChatActionsContext';
import type { ChatViewSpec } from '../utils/viewSpec';
import { ChatCard, ChatCardEmpty } from './ChatCard';

type PatientPeekSpec = Extract<ChatViewSpec, { component: 'PatientPeek' }>;

const MAX_ROWS = 6;
const ROW_CLASS = 'flex min-h-14 items-center gap-3 border-t-[0.5px] border-separator pt-2 first:border-t-0 first:pt-0';

function InactivePatients({ testId }: { readonly testId: string }) {
  const { patients, therapistId } = useChatActions();
  const attention = patients
    .filter((patient) => !therapistId || patient.therapistId === therapistId)
    .map((patient) => ({ ...patient, activity: getPatientActivityStatus(patient.lastActivity) }))
    .filter((patient) => needsAttention(patient.activity))
    .sort(comparePatientsByAttention);

  if (attention.length === 0) {
    return (
      <ChatCard testId={testId} title="Wszyscy ćwiczą">
        <ChatCardEmpty testId={`${testId}-empty`}>Każdy z Twoich pacjentów trenował w ostatnich dniach.</ChatCardEmpty>
      </ChatCard>
    );
  }

  return (
    <ChatCard
      testId={testId}
      title={`Do sprawdzenia: ${attention.length} ${polishPlural(attention.length, 'osoba', 'osoby', 'osób')}`}
    >
      <ul className="flex flex-col gap-2">
        {attention.slice(0, MAX_ROWS).map((patient) => (
          <li key={patient.id} className={ROW_CLASS}>
            <InitialsAvatar name={patient.name} imageUrl={patient.image} muted={patient.isShadowUser} />
            <Link
              href={`/patients/${patient.id}`}
              data-testid={`${testId}-patient-${patient.id}-link`}
              className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground hover:text-tint"
            >
              {patient.name}
            </Link>
            <ActivityStatusLabel tone={patient.activity.tone} label={patient.activity.label} />
          </li>
        ))}
      </ul>
      {attention.length > MAX_ROWS && (
        <Link href="/patients" data-testid={`${testId}-all-link`} className="text-[14px] font-medium text-tint">
          Wszyscy pacjenci
        </Link>
      )}
    </ChatCard>
  );
}

export function PatientPeekCard({ spec, testId }: { readonly spec: PatientPeekSpec; readonly testId: string }) {
  const { patients, openAssign } = useChatActions();
  if (!spec.patientId) return <InactivePatients testId={testId} />;

  const patient = patients.find((candidate) => candidate.id === spec.patientId);
  if (!patient) {
    return (
      <ChatCard testId={testId} title="Nie widzę tego pacjenta">
        <ChatCardEmpty testId={`${testId}-empty`}>Pacjent nie jest na Twojej liście w tej organizacji.</ChatCardEmpty>
      </ChatCard>
    );
  }

  const activity = getPatientActivityStatus(patient.lastActivity);
  return (
    <ChatCard
      testId={testId}
      footer={
        <>
          <Button variant="outline" asChild data-testid={`${testId}-open-link`}>
            <Link href={`/patients/${patient.id}`}>Otwórz kartę</Link>
          </Button>
          <Button onClick={() => openAssign(undefined, toWizardPatient(patient))} data-testid={`${testId}-primary-btn`}>
            Przypisz zestaw
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <InitialsAvatar name={patient.name} imageUrl={patient.image} muted={patient.isShadowUser} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-foreground">{patient.name}</p>
          {patient.contextLabel && <p className="truncate text-[13px] text-label-secondary">{patient.contextLabel}</p>}
        </div>
        <ActivityStatusLabel tone={activity.tone} label={activity.label} />
      </div>
    </ChatCard>
  );
}
