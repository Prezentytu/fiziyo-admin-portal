'use client';

import { useMemo, useState } from 'react';
import { Library, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InitialsAvatar } from '@/components/shared/page';
import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';
import { useChatActions } from '../ChatSessionContext';
import { NO_PATIENT_OPTION } from '../utils/intentRouter';
import { patientChoiceLabels } from '../utils/patientMatch';
import { nominativeName } from '../utils/pickPatientAnswer';
import { PICK_PATIENT_ANSWERED } from '../utils/threadLocalReply';
import { savedInCatalogText, scheduleQuestion, type SetDraftPayload } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';
import { NewPatientForm } from './NewPatientForm';
import { useCreatePatient, useSaveTemplateSet } from './useChatWrites';

const MAX_PATIENTS = 6;

/**
 * "Dla kogo?": first a set without a patient (kept in the catalog, e.g. to try the app), then the
 * organization's patients or a new one, without leaving the thread. Without a draft (after „Inny
 * pacjent”) it only picks the patient and the command behind the question goes on.
 */
export function PickPatientCard({ spec, testId, messageId, chosen }: CardProps<'PickPatient'>) {
  const { organizationId, patients, therapistId, contextPatient, appendExchange, choosePatient, markChosen } =
    useChatActions();
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(Boolean(spec.newPatient));
  const [newPatient, setNewPatient] = useState(spec.newPatient);
  const { create, creating } = useCreatePatient();
  const { saveTemplateSet, saving } = useSaveTemplateSet();

  // The patient the conversation is about comes first (report 01.11: Anna from the chip was last).
  const ordered = useMemo(
    () =>
      [...patients]
        .sort(
          (left, right) =>
            Number(right.id === contextPatient?.id) - Number(left.id === contextPatient?.id) ||
            Number(right.therapistId === therapistId) - Number(left.therapistId === therapistId)
        )
        .map((patient) => ({ patient, searchName: normalizeSearchText(patient.name) })),
    [contextPatient?.id, patients, therapistId]
  );
  const candidateIds = spec.patientIds;
  const matches = useMemo(() => {
    const needle = normalizeSearchText(query).trim();
    const candidates = candidateIds ? ordered.filter((entry) => candidateIds.includes(entry.patient.id)) : ordered;
    const found = needle ? candidates.filter((entry) => entry.searchName.includes(needle)) : candidates;
    return found.slice(0, MAX_PATIENTS).map((entry) => entry.patient);
  }, [candidateIds, ordered, query]);

  // Imiennicy na liście: pod nazwą to, co ich faktycznie różni, a nie wspólny powód terapii.
  const matchLabels = useMemo(() => patientChoiceLabels(matches), [matches]);
  const baseDraft = spec.draft;

  const continueWith = (patientId: string, name: string) => {
    markChosen(messageId, name);
    if (!baseDraft) {
      choosePatient(patientId, name);
      return;
    }
    const draft: SetDraftPayload = { ...baseDraft, patientId };
    appendExchange(name, {
      text: scheduleQuestion(draft.items),
      spec: { component: 'Schedule', draft },
    });
  };

  const continueWithoutPatient = async () => {
    if (!baseDraft) return;
    const saved = await saveTemplateSet(organizationId, baseDraft.name, baseDraft.items);
    if (!saved) return;
    markChosen(messageId, NO_PATIENT_OPTION);
    appendExchange(NO_PATIENT_OPTION, {
      text: savedInCatalogText(saved.name),
      spec: {
        component: 'SetSaved',
        setId: saved.id,
        name: saved.name,
        draft: { ...baseDraft, sourceSetId: saved.id },
      },
    });
  };

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        {chosen === PICK_PATIENT_ANSWERED ? 'Odpowiedź poniżej' : `Wybrano: ${chosen}`}
      </p>
    );
  }

  return (
    <ChatCard testId={testId}>
      {isAdding ? (
        <NewPatientForm
          testId={`${testId}-new`}
          defaultName={newPatient?.name}
          defaults={newPatient}
          submitLabel="Dodaj i przejdź dalej"
          busy={creating}
          onCancel={() => {
            setIsAdding(false);
            setNewPatient(undefined);
          }}
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
            disabled={saving}
            placeholder="Szukaj pacjenta"
            aria-label="Szukaj pacjenta"
            data-testid={`${testId}-search-input`}
          />
          <ul className="flex flex-col">
            {baseDraft && (
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
            )}
            {matches.map((patient, index) => {
              const detail = matchLabels[index].startsWith(`${patient.name} `)
                ? matchLabels[index].slice(patient.name.length).replace(/^[\s·]+/, '')
                : patient.contextLabel || patient.email;
              return (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => continueWith(patient.id, patient.name)}
                    disabled={saving}
                    data-testid={`${testId}-patient-${patient.id}-btn`}
                    className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <InitialsAvatar
                      name={patient.name}
                      imageUrl={patient.image}
                      muted={patient.isShadowUser}
                      className="h-8 w-8"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-foreground">{patient.name}</span>
                      {detail && <span className="block truncate text-[13px] text-label-secondary">{detail}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && (
              <li className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-[14px] text-label-secondary">
                <span>Brak pacjenta o tej nazwie.</span>
                {baseDraft && query.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewPatient({ name: nominativeName(query) });
                      setIsAdding(true);
                    }}
                    data-testid={`${testId}-add-typed-btn`}
                  >
                    <UserPlus aria-hidden="true" />
                    Dodaj „{nominativeName(query)}”
                  </Button>
                )}
              </li>
            )}
          </ul>
          {baseDraft && (
            <Button
              variant="plain"
              size="sm"
              className="self-start"
              onClick={() => setIsAdding(true)}
              disabled={saving}
              data-testid={`${testId}-add-btn`}
            >
              <UserPlus aria-hidden="true" />
              Nowy pacjent
            </Button>
          )}
        </>
      )}
    </ChatCard>
  );
}
