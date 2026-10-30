'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import { buildExerciseImageUrls } from '@/components/shared/exercise/adapters';
import { toWizardPatient, useChatActions } from '../ChatActionsContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { pickExercisesById, searchExercises } from '../utils/exerciseLookup';
import type { ChatViewSpec } from '../utils/viewSpec';
import { ChatCard, ChatCardEmpty } from './ChatCard';

type ExerciseResultsSpec = Extract<ChatViewSpec, { component: 'ExerciseResults' }>;

export function ExerciseResultsCard({ spec, testId }: { readonly spec: ExerciseResultsSpec; readonly testId: string }) {
  const { organizationId, patients, openCreateSet } = useChatActions();
  const { exercises, loading } = useAvailableExercises(organizationId, true);
  const patient = spec.patientId ? patients.find((candidate) => candidate.id === spec.patientId) : undefined;

  const results = useMemo(
    () =>
      spec.exerciseIds.length > 0
        ? pickExercisesById(exercises, spec.exerciseIds)
        : searchExercises(exercises, spec.query),
    [exercises, spec.exerciseIds, spec.query]
  );

  if (loading) {
    return (
      <ChatCard testId={testId} title="Szukam w katalogu">
        <div aria-busy="true" className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-24 rounded-[14px]" />
          ))}
        </div>
      </ChatCard>
    );
  }

  if (results.length === 0) {
    return (
      <ChatCard testId={testId} title={spec.query ? `Brak ćwiczeń: ${spec.query}` : 'Brak ćwiczeń'}>
        <ChatCardEmpty testId={`${testId}-empty`}>
          Brak pasujących ćwiczeń w katalogu. Spróbuj innego słowa, np. nazwy obszaru albo ruchu.
        </ChatCardEmpty>
      </ChatCard>
    );
  }

  return (
    <ChatCard
      testId={testId}
      title={spec.query ? `Ćwiczenia: ${spec.query}` : 'Ćwiczenia z katalogu'}
      meta={patient ? <span>dla: {patient.name}</span> : undefined}
      footer={
        <>
          <span className="text-[13px] text-label-secondary">Zestaw złożysz i sprawdzisz przed zapisem</span>
          <Button
            onClick={() =>
              openCreateSet(
                results.map((exercise) => exercise.id),
                toWizardPatient(patient)
              )
            }
            data-testid={`${testId}-primary-btn`}
          >
            Utwórz z nich zestaw
          </Button>
        </>
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
        {results.map((exercise) => (
          <li
            key={exercise.id}
            data-testid={`${testId}-item-${exercise.id}`}
            className="flex min-w-0 flex-col gap-2 rounded-[14px] bg-fill-quaternary p-3.5"
          >
            <ExerciseThumbnail
              src={buildExerciseImageUrls(exercise)[0] ?? null}
              sizeClass="h-10 w-10"
              className="rounded-[10px]"
            />
            <span className="line-clamp-2 text-[15px] font-medium leading-[21px] text-foreground">{exercise.name}</span>
          </li>
        ))}
      </ul>
    </ChatCard>
  );
}
