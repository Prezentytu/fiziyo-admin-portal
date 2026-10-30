'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { Bell, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ActivityStatusLabel, InitialsAvatar } from '@/components/shared/page';
import { getPatientActivityStatus } from '@/features/patients/utils/patientActivityStatus';
import { SEND_EXERCISE_REMINDERS_MUTATION } from '@/graphql/mutations/users.mutations';
import { polishPlural } from '@/utils/polishPlural';
import { useChatActions } from '../ChatSessionContext';
import { selectInactivePatients } from '../utils/inactivePatients';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardEmpty } from './ChatCard';

const MAX_ROWS = 6;
const ROW_CLASS = 'flex min-h-14 flex-wrap items-center gap-3 border-t-[0.5px] border-hairline pt-2 first:border-t-0 first:pt-0';

interface ReminderResult {
  sendExerciseReminders?: { sent: number; skipped: number };
}

function useReminders(organizationId: string) {
  const [sendReminders, { loading }] = useMutation<ReminderResult>(SEND_EXERCISE_REMINDERS_MUTATION);
  const [remindedIds, setRemindedIds] = useState<string[]>([]);

  const remind = async (patientIds: string[]) => {
    try {
      const result = await sendReminders({ variables: { organizationId, patientIds } });
      const sent = result.data?.sendExerciseReminders?.sent ?? 0;
      const skipped = result.data?.sendExerciseReminders?.skipped ?? 0;
      setRemindedIds((previous) => [...new Set([...previous, ...patientIds])]);
      if (sent > 0) toast.success(`Wysłano ${sent} ${polishPlural(sent, 'przypomnienie', 'przypomnienia', 'przypomnień')}`);
      if (skipped > 0) {
        toast.info(`Pominięto: ${skipped}. Przypomnienie było już dziś albo pacjent nie ma jeszcze aplikacji.`);
      }
    } catch {
      toast.error('Nie udało się wysłać przypomnienia');
    }
  };

  return { remind, sending: loading, remindedIds };
}

function InactivePatients({ testId }: { readonly testId: string }) {
  const { organizationId, patients, therapistId, showPatient } = useChatActions();
  const attention = selectInactivePatients(patients, therapistId);
  const { remind, sending, remindedIds } = useReminders(organizationId);

  if (!attention) {
    return (
      <ChatCard testId={testId} title="Kto nie ćwiczy">
        <ChatCardEmpty testId={`${testId}-loading`}>Wczytywanie pacjentów…</ChatCardEmpty>
      </ChatCard>
    );
  }

  if (attention.length === 0) {
    return (
      <ChatCard testId={testId} title="Wszyscy ćwiczą">
        <ChatCardEmpty testId={`${testId}-empty`}>Każdy z Twoich pacjentów trenował w ostatnich dniach.</ChatCardEmpty>
      </ChatCard>
    );
  }

  const shown = attention.slice(0, MAX_ROWS);
  const pending = shown.filter((patient) => !remindedIds.includes(patient.id)).map((patient) => patient.id);

  return (
    <ChatCard
      testId={testId}
      title={`Do sprawdzenia: ${attention.length} ${polishPlural(attention.length, 'osoba', 'osoby', 'osób')}`}
      footer={
        <>
          {attention.length > MAX_ROWS ? (
            <Link href="/patients" data-testid={`${testId}-all-link`} className="text-[14px] font-medium text-tint">
              Wszyscy pacjenci
            </Link>
          ) : (
            <span className="text-[13px] text-label-secondary">Przypomnienie przyjdzie jako powiadomienie w aplikacji</span>
          )}
          <Button
            onClick={() => void remind(pending)}
            disabled={pending.length === 0 || sending}
            data-testid={`${testId}-remind-all-btn`}
          >
            <Bell aria-hidden="true" />
            Przypomnij wszystkim
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {shown.map((patient) => {
          const isReminded = remindedIds.includes(patient.id);
          return (
            <li key={patient.id} className={ROW_CLASS}>
              <InitialsAvatar name={patient.name} imageUrl={patient.image} muted={patient.isShadowUser} />
              <button
                type="button"
                onClick={() => showPatient(patient.id)}
                data-testid={`${testId}-patient-${patient.id}-btn`}
                className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-foreground hover:text-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {patient.name}
              </button>
              <ActivityStatusLabel tone={patient.activity.tone} label={patient.activity.label} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void remind([patient.id])}
                disabled={isReminded || sending}
                data-testid={`${testId}-remind-${patient.id}-btn`}
              >
                {isReminded ? <Check aria-hidden="true" /> : <Bell aria-hidden="true" />}
                {isReminded ? 'Przypomniano' : 'Przypomnij'}
              </Button>
            </li>
          );
        })}
      </ul>
    </ChatCard>
  );
}

export function PatientPeekCard({ spec, testId }: CardProps<'PatientPeek'>) {
  const { patients, appendExchange, showPatient } = useChatActions();
  if (!spec.patientId) return <InactivePatients testId={testId} />;

  const patient = patients.find((candidate) => candidate.id === spec.patientId);
  if (!patient) {
    return (
      <ChatCard testId={testId} title="Nie widzę tego pacjenta">
        <ChatCardEmpty testId={`${testId}-empty`}>Pacjent nie jest na liście tej organizacji.</ChatCardEmpty>
      </ChatCard>
    );
  }

  const activity = getPatientActivityStatus(patient.lastActivity);
  return (
    <ChatCard
      testId={testId}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => showPatient(patient.id)} data-testid={`${testId}-context-btn`}>
            Kontekst
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild data-testid={`${testId}-open-link`}>
              <Link href={`/patients/${patient.id}`}>Otwórz kartę</Link>
            </Button>
            <Button
              onClick={() =>
                appendExchange(`Ułóż zestaw: ${patient.name}`, {
                  text: `Dodaj ćwiczenia z katalogu albo napisz, na jaki problem, np. „${patient.name}, kolano”.`,
                  spec: { component: 'SetDraft', patientId: patient.id, exerciseIds: [] },
                })
              }
              data-testid={`${testId}-primary-btn`}
            >
              Ułóż zestaw
            </Button>
          </div>
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
