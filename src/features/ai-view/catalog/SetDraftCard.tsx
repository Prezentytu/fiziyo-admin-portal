'use client';

import { useMemo, useState } from 'react';
import { Undo2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseExecutionCard } from '@/components/shared/exercise/ExerciseExecutionCard';
import { fromBuilderExercise, fromExerciseMapping } from '@/components/shared/exercise/adapters';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise/types';
import { getExerciseDefaultParams } from '@/features/exercise-sets/utils/exerciseDefaults';
import { sortMappingsByOrder } from '@/features/assignment/utils/sortMappingsByOrder';
import { formatExerciseCount } from '@/utils/polishPlural';
import { toWizardPatient, useChatActions } from '../ChatActionsContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { pickExercisesById } from '../utils/exerciseLookup';
import type { ChatViewSpec } from '../utils/viewSpec';
import { ChatCard, ChatCardEmpty, ChatCardNote } from './ChatCard';

type SetDraftSpec = Extract<ChatViewSpec, { component: 'SetDraft' }>;

interface DraftRow {
  exerciseId: string;
  card: ExerciseExecutionCardData;
}

export function SetDraftCard({ spec, testId }: { readonly spec: SetDraftSpec; readonly testId: string }) {
  const { organizationId, patients, sets, openAssign, openCreateSet } = useChatActions();
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const set = spec.setId ? sets.find((candidate) => candidate.id === spec.setId) : undefined;
  const patient = spec.patientId ? patients.find((candidate) => candidate.id === spec.patientId) : undefined;
  const needsCatalog = !set && spec.exerciseIds.length > 0;
  const { exercises, loading } = useAvailableExercises(organizationId, needsCatalog);

  const rows = useMemo<DraftRow[]>(() => {
    if (set) {
      return sortMappingsByOrder(set.exerciseMappings ?? []).map((mapping) => ({
        exerciseId: mapping.exerciseId,
        card: fromExerciseMapping(mapping),
      }));
    }
    return pickExercisesById(exercises, spec.exerciseIds).map((exercise) => ({
      exerciseId: exercise.id,
      card: fromBuilderExercise(exercise, getExerciseDefaultParams(exercise)),
    }));
  }, [set, exercises, spec.exerciseIds]);

  const visibleRows = rows.filter((row) => !removedIds.includes(row.exerciseId));
  const isUnchangedSet = Boolean(set) && removedIds.length === 0;
  const lastRemoved = removedIds.at(-1);

  const handlePrimary = () => {
    const wizardPatient = toWizardPatient(patient);
    if (set && isUnchangedSet) {
      openAssign(set, wizardPatient);
      return;
    }
    openCreateSet(
      visibleRows.map((row) => row.exerciseId),
      wizardPatient
    );
  };

  if (needsCatalog && loading) {
    return (
      <ChatCard testId={testId} title="Przygotowuję propozycję">
        <div aria-busy="true" className="flex flex-col gap-2">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </ChatCard>
    );
  }

  if (rows.length === 0) {
    return (
      <ChatCard testId={testId} title="Nie znaleziono ćwiczeń">
        <ChatCardEmpty testId={`${testId}-empty`}>
          Ten zestaw albo ćwiczenia nie są już dostępne w Twojej organizacji. Napisz, czego szukasz, a zaproponuję inne.
        </ChatCardEmpty>
      </ChatCard>
    );
  }

  const primaryLabel = isUnchangedSet
    ? patient
      ? `Przypisz: ${patient.name}`
      : 'Przypisz pacjentowi'
    : patient
      ? `Utwórz zestaw dla: ${patient.name}`
      : 'Utwórz zestaw';

  return (
    <ChatCard
      testId={testId}
      title={set?.name ?? 'Propozycja zestawu'}
      meta={
        <>
          <span>{formatExerciseCount(visibleRows.length)}</span>
          {patient && <span>dla: {patient.name}</span>}
          {spec.note && <span>{spec.note}</span>}
        </>
      }
      footer={
        <>
          {lastRemoved ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRemovedIds((previous) => previous.slice(0, -1))}
              data-testid={`${testId}-undo-btn`}
            >
              <Undo2 aria-hidden="true" />
              Cofnij usunięcie
            </Button>
          ) : (
            <span className="text-[13px] text-label-secondary">Podstawowe parametry z katalogu</span>
          )}
          <Button onClick={handlePrimary} disabled={visibleRows.length === 0} data-testid={`${testId}-primary-btn`}>
            {primaryLabel}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {visibleRows.map((row) => (
          <li key={row.exerciseId} className="flex items-center gap-2">
            <ExerciseExecutionCard
              mode="view"
              viewVariant="compact"
              exercise={row.card}
              className="min-w-0 flex-1"
              testIdPrefix={`${testId}-exercise`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRemovedIds((previous) => [...previous, row.exerciseId])}
              aria-label={`Usuń: ${row.card.displayName}`}
              data-testid={`${testId}-remove-${row.exerciseId}-btn`}
            >
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <ChatCardNote>
        To propozycja z katalogu, a nie zalecenie dla tej osoby. Decyzja należy do Ciebie: nic nie trafi do pacjenta
        przed zatwierdzeniem w kolejnym kroku.
      </ChatCardNote>
    </ChatCard>
  );
}
