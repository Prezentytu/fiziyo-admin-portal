import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';

export const DEFAULT_TEMPLATE_SET_FREQUENCY = {
  timesPerDay: '1',
  timesPerWeek: '3',
  isFlexible: true,
  breakBetweenSets: '24',
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
} as const;

export interface CreateTemplateSetInput {
  organizationId: string;
  name: string;
  description?: string | null;
}

export interface CreateTemplateSetVariables {
  organizationId: string;
  name: string;
  description: string | null;
  kind: 'TEMPLATE';
  templateSource: 'ORGANIZATION_PRIVATE';
  isTemplate: true;
  frequency: typeof DEFAULT_TEMPLATE_SET_FREQUENCY;
}

export interface ExerciseMappingSubmitInput {
  exerciseId: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  executionTime?: number | null;
  notes?: string | null;
  customName?: string | null;
  customDescription?: string | null;
  tempo?: string | null;
  loadWeightKg?: number | null;
  loadValue?: number | null;
  /** Template-set overridesJson (SPEC-023); "" clears, null omits (leave unchanged on update). */
  overridesJson?: string | null;
}

export interface AddExerciseToSetVariables {
  exerciseId: string;
  exerciseSetId: string;
  order: number;
  sets: number | null;
  reps: number | null;
  duration: number | null;
  restSets: number | null;
  restReps: number | null;
  preparationTime: number | null;
  executionTime: number | null;
  notes: string | null;
  customName: string | null;
  customDescription: string | null;
  tempo: string | null;
  loadWeightKg: number | null;
  loadSource: string | null;
  loadType: string | null;
  loadValue: number | null;
  loadUnit: string | null;
  loadText: string | null;
  overridesJson?: string | null;
}

export interface CreateTemplateSetMutations {
  createSet: (options: { variables: CreateTemplateSetVariables }) => Promise<{ data?: unknown }>;
  addExercise: (options: { variables: AddExerciseToSetVariables }) => Promise<unknown>;
}

function resolveCreatedSetId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  if (!('createExerciseSet' in data)) return null;
  const created = (data as { createExerciseSet?: unknown }).createExerciseSet;
  if (!created || typeof created !== 'object') return null;
  if (!('id' in created)) return null;
  const setId = (created as { id?: unknown }).id;
  return typeof setId === 'string' && setId.length > 0 ? setId : null;
}

function toNullableNumber(value: number | null | undefined): number | null {
  return value || null;
}

function toNullableString(value: string | null | undefined): string | null {
  return value || null;
}

export function buildCreateTemplateSetVariables(input: CreateTemplateSetInput): CreateTemplateSetVariables {
  return {
    organizationId: input.organizationId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    kind: 'TEMPLATE',
    templateSource: 'ORGANIZATION_PRIVATE',
    isTemplate: true,
    frequency: DEFAULT_TEMPLATE_SET_FREQUENCY,
  };
}

export function buildAddExerciseToSetVariables(
  exerciseSetId: string,
  order: number,
  mapping: ExerciseMappingSubmitInput
): AddExerciseToSetVariables {
  return {
    exerciseId: mapping.exerciseId,
    exerciseSetId,
    order,
    sets: toNullableNumber(mapping.sets),
    reps: toNullableNumber(mapping.reps),
    duration: toNullableNumber(mapping.duration),
    restSets: toNullableNumber(mapping.restSets),
    restReps: toNullableNumber(mapping.restReps),
    preparationTime: toNullableNumber(mapping.preparationTime),
    executionTime: toNullableNumber(mapping.executionTime),
    notes: toNullableString(mapping.notes),
    customName: toNullableString(mapping.customName),
    customDescription: toNullableString(mapping.customDescription),
    tempo: toNullableString(mapping.tempo),
    ...buildExerciseLoadMutationVars(mapping.loadWeightKg ?? mapping.loadValue),
    overridesJson: mapping.overridesJson ?? '',
  };
}

/**
 * Canonical create-template-set write path shared by CreateSetWizard and sidebar CreateSetDialog.
 */
export async function submitCreateTemplateSet(
  mutations: CreateTemplateSetMutations,
  input: CreateTemplateSetInput,
  mappings: ExerciseMappingSubmitInput[]
): Promise<string> {
  const createVariables = buildCreateTemplateSetVariables(input);
  const result = await mutations.createSet({ variables: createVariables });
  const newSetId = resolveCreatedSetId(result.data);

  if (!newSetId) {
    throw new Error('Nie udało się utworzyć zestawu');
  }

  let order = 0;
  for (const mapping of mappings) {
    await mutations.addExercise({
      variables: buildAddExerciseToSetVariables(newSetId, order, mapping),
    });
    order += 1;
  }

  return newSetId;
}
