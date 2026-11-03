import {
  buildAssignmentFrequencyPayload,
  type AssignmentFrequencyPayload,
} from '@/features/assignment/utils/scheduleFrequencyUtils';
import {
  buildAddExerciseToSetVariables,
  type AddExerciseToSetVariables,
} from '@/features/exercise-sets/utils/createSetSubmit';
import { planFrequency, resolvePlanDates, type SchedulePlan } from './schedulePlan';
import { toMappingInput, type SetDraftPayload } from './setDraft';

export interface CreatePatientPlanVariables {
  organizationId: string;
  name: string;
  description: string | null;
  kind: 'PATIENT_PLAN';
  sourceExerciseSetId: string | null;
  isTemplate: false;
}

export interface AssignPlanVariables {
  exerciseSetId: string;
  patientId: string;
  startDate: string;
  endDate: string;
  frequency: AssignmentFrequencyPayload;
}

export interface SendPlanMutations {
  createSet: (variables: CreatePatientPlanVariables) => Promise<string | null>;
  addExercise: (variables: AddExerciseToSetVariables) => Promise<unknown>;
  assign: (variables: AssignPlanVariables) => Promise<string | null>;
}

/**
 * Same write path as the Assignment Wizard: a patient plan (copy of the draft, linked to the catalog
 * set it came from), its exercises in draft order, then the assignment with dates and rhythm.
 */
export async function sendPlan(
  input: { organizationId: string; patientId: string; draft: SetDraftPayload; plan: SchedulePlan; now?: Date },
  mutations: SendPlanMutations
): Promise<{ setId: string; assignmentId: string | null }> {
  if (input.draft.items.length === 0) throw new Error('Zestaw jest pusty.');
  const setId = await mutations.createSet({
    organizationId: input.organizationId,
    name: input.draft.name.trim() || 'Plan pacjenta',
    description: null,
    kind: 'PATIENT_PLAN',
    sourceExerciseSetId: input.draft.sourceSetId ?? null,
    isTemplate: false,
  });
  if (!setId) throw new Error('Nie udało się utworzyć planu pacjenta.');

  for (const [index, item] of input.draft.items.entries()) {
    await mutations.addExercise(buildAddExerciseToSetVariables(setId, index + 1, toMappingInput(item)));
  }

  const { startDate, endDate } = resolvePlanDates(input.plan, input.now);
  const assignmentId = await mutations.assign({
    exerciseSetId: setId,
    patientId: input.patientId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    frequency: buildAssignmentFrequencyPayload(planFrequency(input.plan)),
  });
  return { setId, assignmentId };
}
