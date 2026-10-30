'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import type { OrganizationExerciseSetsResponse, OrganizationPatientsResponse } from '@/types/apollo';
import { isTemplateSet } from '@/features/exercise-sets/utils/setKind';
import type { ExerciseSet } from '@/features/assignment/types';
import { normalizeFrequencySeed } from '@/features/assignment/utils/scheduleFrequencyUtils';
import type { IntentContext } from './utils/intentRouter';

export interface ChatPatient {
  id: string;
  name: string;
  email?: string;
  image?: string;
  isShadowUser?: boolean;
  lastActivity?: string;
  contextLabel?: string;
  therapistId?: string;
}

type RawSet = OrganizationExerciseSetsResponse['exerciseSets'][number];

function toAssignmentSet(set: RawSet): ExerciseSet {
  return {
    id: set.id,
    name: set.name,
    description: set.description ?? undefined,
    kind: set.kind,
    isTemplate: set.isTemplate,
    frequency: set.frequency ? normalizeFrequencySeed(set.frequency) : undefined,
    exerciseMappings: (set.exerciseMappings ?? []) as ExerciseSet['exerciseMappings'],
  };
}

/**
 * Organization patients (everyone sees everyone, collaborative care) and template sets: what chat may reference.
 * Sets are heavy and only the chat home reads them; other pages in chat mode need just the patients.
 */
export function useChatData(organizationId: string | undefined, withSets: boolean) {
  const { data: patientsData, loading: patientsLoading } = useQuery<OrganizationPatientsResponse>(
    GET_ORGANIZATION_PATIENTS_QUERY,
    { variables: { organizationId, filter: 'all' }, skip: !organizationId }
  );
  const { data: setsData, loading: setsLoading } = useQuery<OrganizationExerciseSetsResponse>(
    GET_ORGANIZATION_EXERCISE_SETS_QUERY,
    { variables: { organizationId }, skip: !organizationId || !withSets }
  );

  const patients = useMemo<ChatPatient[]>(
    () =>
      (patientsData?.organizationPatients ?? []).map((item) => ({
        id: item.patient.id,
        name: item.patient.fullname || item.patient.email || 'Pacjent',
        email: item.patient.email,
        image: item.patient.image,
        isShadowUser: item.patient.isShadowUser,
        lastActivity: item.lastActivity,
        contextLabel: item.contextLabel,
        therapistId: item.therapist?.id,
      })),
    [patientsData]
  );

  const sets = useMemo<ExerciseSet[]>(
    () => (setsData?.exerciseSets ?? []).filter((set) => isTemplateSet(set)).map(toAssignmentSet),
    [setsData]
  );

  const intentContext = useMemo<IntentContext>(() => ({ patients, sets }), [patients, sets]);

  return { patients, sets, intentContext, loading: patientsLoading || setsLoading };
}
