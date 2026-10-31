'use client';

import { useMemo, useState } from 'react';
import { Library, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InitialsAvatar } from '@/components/shared/page';
import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { useChatActions } from '../ChatSessionContext';
import { NO_PATIENT_OPTION } from '../utils/intentRouter';
import { proposeDraftName, savedInCatalogText, scheduleQuestion, type SetDraftPayload } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { NewPatientForm } from './NewPatientForm';
import { useCreatePatient, useSaveTemplateSet } from './useChatWrites';

const MAX_PATIENTS = 6;

/**
 * "Dla kogo?": first a set without a patient (kept in the catalog, e.g. to try the app), then the
 * organization's patients or a new one, without leaving the thread.
 */
export function PickPatientCard({ spec, testId, messageId, chosen }: CardProps<'PickPatient'>) {
  const { organizationId, patients, therapistId, appendExchange, markChosen } = useChatActions();
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { create, creating } = useCreatePatient();
  const { saveTemplateSet, saving } = useSaveTemplateSet();

  const ordered = useMemo(
    () =>
      [...patients]
        .sort((left, right) => Number(right.therapistId === therapistId) - Number(left.therapistId === therapistId))
        .map((patient) => ({ patient, searchName: normalizeSearchText(patient.name) })),
    [patients, therapistId]
  );
  const matches = useMemo(() => {
    const needle = normalizeSearchText(query).trim();
    const found = needle ? ordered.filter((entry) => entry.searchName.includes(needle)) : ordered;
    return found.slice(0, MAX_PATIENTS).map((entry) => entry.patient);
  }, [ordered, query]);

  const continueWith = (patientId: string, name: string) => {
    markChosen(messageId, name);
    const draft: SetDraftPayload = {
      ...spec.draft,
      patientId,
      name: proposeDraftName({ setName: spec.draft.name.split(' · ')[0], patientName: name }),
    };
    appendExchange(name, {
      text: scheduleQuestion(draft.items),
      spec: { component: 'Schedule', draft },
    });
  };

  const continueWithoutPatient = async () => {
    const saved = await saveTemplateSet(organizationId, spec.draft.name, spec.draft.items);
    if (!saved) return;
    markChosen(messageId, NO_PATIENT_OPTION);
    appendExchange(NO_PATIENT_OPTION, {
      text: savedInCatalogText(saved.name),
      spec: { component: 'SetSaved', setId: saved.id, name: saved.name },
    });
  };

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Wybrano: {chosen}
      </p>
    );
  }

  return (
    <ChatCard testId={testId}>
      {isAdding ? (
        <NewPatientForm
          testId={`${testId}-new`}
          submitLabel="Dodaj i przejdź dalej"
          busy={creating}
          onCancel={() => setIsAdding(false)}
          onSubmit={async (values) => {
            const patient = await create(organizationId, values, therapistId);
            if (patient) continueWith(patient.id, patient.name);
          }}
        />
      ) : (
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj pacjenta"
            aria-label="Szukaj pacjenta"
            data-testid={`${testId}-search-input`}
          />
          <ul className="flex flex-col">
            <li>
              <button
                type="button"
                onClick={() => void continueWithoutPatient()}
                disabled={saving}
                data-testid={`${testId}-no-patient-btn`}
                className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill-quaternary text-tint">
                  <Library className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground">{NO_PATIENT_OPTION}</span>
                  <span className="block truncate text-[13px] text-label-secondary">Zapisz w katalogu gabinetu</span>
                </span>
              </button>
            </li>
            {matches.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => continueWith(patient.id, patient.name)}
                  data-testid={`${testId}-patient-${patient.id}-btn`}
                  className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <InitialsAvatar
                    name={patient.name}
                    imageUrl={patient.image}
                    muted={patient.isShadowUser}
                    className="h-8 w-8"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-foreground">{patient.name}</span>
                    {patient.contextLabel && (
                      <span className="block truncate text-[13px] text-label-secondary">{patient.contextLabel}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-2 py-2 text-[14px] text-label-secondary">Brak pacjenta o tej nazwie.</li>
            )}
          </ul>
          <Button
            variant="plain"
            size="sm"
            className="self-start"
            onClick={() => setIsAdding(true)}
            data-testid={`${testId}-add-btn`}
          >
            <UserPlus aria-hidden="true" />
            Nowy pacjent
          </Button>
        </>
      )}
    </ChatCard>
  );
}
