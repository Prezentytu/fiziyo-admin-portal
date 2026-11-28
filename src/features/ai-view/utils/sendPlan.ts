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
  /** SPEC-068 (K1): zamyka zastępowane przypisanie dopiero po poprawnym utworzeniu nowego planu. */
  completeAssignment?: (assignmentId: string) => Promise<unknown>;
}

/**
 * Same write path as the Assignment Wizard: a patient plan (copy of the draft, linked to the catalog
 * set it came from), its exercises in draft order, then the assignment with dates and rhythm.
 */
export async function sendPlan(
  input: {
    organizationId: string;
    patientId: string;
    draft: SetDraftPayload;
    plan: SchedulePlan;
    now?: Date;
    /** SPEC-068 (K1): ID aktywnego przypisania do zastąpienia po przypisaniu nowej wersji. */
    replaceAssignmentId?: string;
  },
  mutations: SendPlanMutations
): Promise<{ setId: string; assignmentId: string | null; replacedAssignmentId?: string; replaceFailed?: true }> {
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

  // Nowy plan jest już przypisany: błąd zamykania starego nie może wyglądać jak nieudana wysyłka,
  // bo ponowne kliknięcie utworzyłoby drugi nowy plan. Zgłaszamy go flagą, nie wyjątkiem.
  if (input.replaceAssignmentId && mutations.completeAssignment) {
    try {
      await mutations.completeAssignment(input.replaceAssignmentId);
      return { setId, assignmentId, replacedAssignmentId: input.replaceAssignmentId };
    } catch {
      return { setId, assignmentId, replaceFailed: true };
    }
  }

  return { setId, assignmentId };
}

/**
 * What the therapist reads after "Wyślij pacjentowi". The plan is saved either way, but only a
 * patient with an account sees it in the app; without one the next step is the QR code, the link
 * or the printed card (test 17.11, K5: "zobaczy plan w aplikacji" for a patient without an account).
 */
export function sentText(
  patient: { name: string; isShadowUser?: boolean | null },
  planLabel: string,
  options?: { replaced?: boolean; replaceFailed?: boolean }
): string {
  const replacedPrefix = options?.replaced ? 'Plan zaktualizowany (poprzednia wersja została zastąpiona). ' : '';
  const replaceFailedSuffix = options?.replaceFailed
    ? ' Poprzedniego planu nie udało się zakończyć, więc nadal jest aktywny: zakończ go na karcie pacjenta.'
    : '';
  if (patient.isShadowUser === false) {
    return `${replacedPrefix}${options?.replaced ? '' : 'Wysłane. '}${patient.name} zobaczy plan w aplikacji: ${planLabel}.${replaceFailedSuffix}`;
  }
  if (patient.isShadowUser) {
    return `${replacedPrefix}Plan zapisany: ${planLabel}. ${patient.name} nie ma jeszcze konta w aplikacji, więc planu tam nie widzi. Daj kod QR albo link do aplikacji, albo wydruk karty z planem.${replaceFailedSuffix}`;
  }
  return `${replacedPrefix}Plan zapisany dla: ${patient.name} (${planLabel}).${replaceFailedSuffix}`;
}
