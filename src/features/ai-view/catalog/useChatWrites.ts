'use client';

import { useApolloClient, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/useSingleFlight';

import {
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
  CREATE_EXERCISE_MUTATION,
  CREATE_EXERCISE_SET_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { formatPatientPhone, patientCreateRefetchQueries } from '@/features/patients/utils/shadowPatient';
import { CREATE_SHADOW_PATIENT_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_CURRENT_BILLING_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import { GET_AVAILABLE_EXERCISES_PICKER_QUERY } from '@/graphql/queries/exercises.queries';
import { fetchWholeLibrary } from '@/lib/graphql/wholeLibrary';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import type { CreateExerciseMutationResult, CreateExerciseVariables } from '@/graphql/types/exercise.types';
import { useMarkWarmupPositions } from '@/features/exercise-sets/hooks/useMarkWarmupPositions';
import { orderWarmupFirst } from '@/features/exercise-sets/utils/exerciseDependencies';
import {
  submitCreateTemplateSet,
  type AddExerciseToSetVariables,
} from '@/features/exercise-sets/utils/createSetSubmit';
import type { FrequencyInput } from '@/features/assignment/utils/scheduleFrequencyUtils';
import {
  buildCreateExerciseVariables,
  type CreateExerciseDraft,
} from '@/features/exercises/utils/buildCreateExerciseVariables';
import type { SchedulePlan } from '../utils/schedulePlan';
import { sendPlan, type AssignPlanVariables, type CreatePatientPlanVariables } from '../utils/sendPlan';
import { toMappingInput, type DraftItem, type SetDraftPayload } from '../utils/setDraft';

const isWarmupItem = (item: DraftItem) => item.isWarmup === true;

interface CreatedSet {
  createExerciseSet?: { id?: string; name?: string };
}

interface AssignedSet {
  assignExerciseSetToPatient?: { id?: string };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać grafiki'));
    reader.readAsDataURL(file);
  });
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Catalog set (TEMPLATE) from a chat draft, through the same write path as the set wizard. */
export function useSaveTemplateSet() {
  const [createSet] = useMutation(CREATE_EXERCISE_SET_MUTATION);
  const [addExercise] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);
  const apolloClient = useApolloClient();
  const markWarmup = useMarkWarmupPositions();

  const { run: saveTemplateSet, pending: saving } = useSingleFlight(
    async (
      organizationId: string,
      name: string,
      items: readonly DraftItem[],
      description?: string,
      frequency?: FrequencyInput
    ) => {
      try {
        const ordered = orderWarmupFirst(items, isWarmupItem);
        const setId = await submitCreateTemplateSet(
          {
            createSet: (options) => createSet(options),
            addExercise: (options: { variables: AddExerciseToSetVariables }) => addExercise(options),
          },
          { organizationId, name, description, frequency },
          ordered.map(toMappingInput)
        );
        await markWarmup(setId, ordered.map(isWarmupItem));
        void apolloClient.refetchQueries({ include: [GET_ORGANIZATION_EXERCISE_SETS_QUERY] }).catch(() => undefined);
        return { id: setId, name };
      } catch (error) {
        toast.error(errorText(error, 'Nie udało się zapisać zestawu'));
        return null;
      }
    }
  );

  return { saveTemplateSet, saving };
}

/** Patient plan + assignment from the summary card ("Wyślij"). */
export function useSendPlan() {
  const [createSet] = useMutation<CreatedSet>(CREATE_EXERCISE_SET_MUTATION);
  const [addExercise] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);
  const [assign] = useMutation<AssignedSet>(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION);
  const apolloClient = useApolloClient();
  const markWarmup = useMarkWarmupPositions();

  const { run: send, pending: sending } = useSingleFlight(
    async (organizationId: string, patientId: string, draft: SetDraftPayload, plan: SchedulePlan) => {
      try {
        const ordered = { ...draft, items: orderWarmupFirst(draft.items, isWarmupItem) };
        const result = await sendPlan(
          { organizationId, patientId, draft: ordered, plan },
          {
            createSet: async (variables: CreatePatientPlanVariables) =>
              (await createSet({ variables })).data?.createExerciseSet?.id ?? null,
            addExercise: (variables: AddExerciseToSetVariables) => addExercise({ variables }),
            assign: async (variables: AssignPlanVariables) =>
              (await assign({ variables })).data?.assignExerciseSetToPatient?.id ?? null,
          }
        );
        await markWarmup(result.setId, ordered.items.map(isWarmupItem));
        void Promise.all([
          apolloClient.query({
            query: GET_ORGANIZATION_PATIENTS_QUERY,
            variables: { organizationId, filter: 'all' },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query({
            query: GET_ORGANIZATION_EXERCISE_SETS_QUERY,
            variables: { organizationId },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query({
            query: GET_CURRENT_BILLING_STATUS_QUERY,
            variables: { organizationId },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query({
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
            fetchPolicy: 'network-only',
          }),
        ]).catch(() => undefined);
        return result;
      } catch (error) {
        toast.error(errorText(error, 'Nie udało się wysłać zestawu'));
        return null;
      }
    }
  );

  return { send, sending };
}

export interface NewPatientInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  contextLabel?: string;
}

/** Shadow patient (user + organization + therapist in one step), as in the patient dialog. */
export function useCreatePatient() {
  const [createPatient] = useMutation<{ createShadowPatient?: { id: string; fullname?: string } }>(
    CREATE_SHADOW_PATIENT_MUTATION
  );
  const apolloClient = useApolloClient();

  const { run: create, pending: creating } = useSingleFlight(
    async (organizationId: string, input: NewPatientInput, therapistId?: string) => {
      try {
        const phone = formatPatientPhone(input.phone);
        const result = await createPatient({
          // Not awaited: a failed refresh would reject a create that already happened.
          refetchQueries: patientCreateRefetchQueries(organizationId, therapistId),
          variables: {
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phone,
            email: input.email?.trim() || null,
            organizationId,
            contextLabel: input.contextLabel?.trim() || null,
            // SMS-y nie są obsługiwane (17.11): zaproszenie idzie e-mailem albo kodem QR.
            sendActivationSms: false,
          },
        });
        const patient = result.data?.createShadowPatient;
        if (!patient) throw new Error('Nie udało się dodać pacjenta');
        // The chat's own list must have the new patient before the next card asks for it.
        await apolloClient
          .query({
            query: GET_ORGANIZATION_PATIENTS_QUERY,
            variables: { organizationId, filter: 'all' },
            fetchPolicy: 'network-only',
          })
          .catch(() => undefined);
        return { id: patient.id, name: patient.fullname || `${input.firstName} ${input.lastName}`.trim() };
      } catch (error) {
        toast.error(errorText(error, 'Nie udało się dodać pacjenta'));
        return null;
      }
    }
  );

  return { create, creating };
}

/** Organization exercise through the single create write path (`buildCreateExerciseVariables`). */
export function useCreateExercise() {
  const [createExercise] = useMutation<CreateExerciseMutationResult, CreateExerciseVariables>(CREATE_EXERCISE_MUTATION);
  const [uploadImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION);
  const apolloClient = useApolloClient();

  const { run: create, pending: creating } = useSingleFlight(
    async (organizationId: string, draft: CreateExerciseDraft, image?: File | null) => {
      try {
        const result = await createExercise({ variables: buildCreateExerciseVariables({ organizationId, draft }) });
        const exercise = result.data?.createExercise;
        if (!exercise?.id) throw new Error('Nie udało się utworzyć ćwiczenia');
        // Grafika idzie po utworzeniu rekordu, jak w kreatorze; jej błąd nie cofa zapisanego ćwiczenia.
        if (image) {
          try {
            await uploadImage({
              variables: { exerciseId: exercise.id, base64Image: await fileToBase64(image), contentType: image.type },
            });
          } catch {
            toast.error('Ćwiczenie zapisane, ale grafiki nie udało się dodać. Dodasz ją na karcie ćwiczenia.');
          }
        }
        await fetchWholeLibrary(
          apolloClient,
          GET_AVAILABLE_EXERCISES_PICKER_QUERY,
          organizationId,
          'network-only'
        ).catch(() => undefined);
        return { id: exercise.id, name: exercise.name };
      } catch (error) {
        toast.error(errorText(error, 'Nie udało się utworzyć ćwiczenia'));
        return null;
      }
    }
  );

  return { create, creating };
}
