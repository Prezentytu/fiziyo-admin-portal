import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';
import type { CatalogZeroableDose } from './exerciseDefaults';
import {
  buildAssignmentFrequencyPayload,
  type AssignmentFrequencyPayload,
  type FrequencyInput,
} from '@/features/assignment/utils/scheduleFrequencyUtils';

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
  /** Harmonogram wybrany w kreatorze; bez niego zestaw dostaje domyślny elastyczny 3×/tydzień. */
  frequency?: FrequencyInput | null;
}

export interface CreateTemplateSetVariables {
  organizationId: string;
  name: string;
  description: string | null;
  kind: 'TEMPLATE';
  templateSource: 'ORGANIZATION_PRIVATE';
  isTemplate: true;
  frequency: typeof DEFAULT_TEMPLATE_SET_FREQUENCY | AssignmentFrequencyPayload;
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
  /** Wartości katalogu ćwiczenia (`getCatalogZeroableDose`); bez nich wpisane 0 zapisuje się jak dotąd. */
  catalog?: CatalogZeroableDose;
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

type ZeroableField = keyof CatalogZeroableDose;

/**
 * Wpisane 0 zostaje zerem, gdy `null` („jak w katalogu”, łańcuch `pick` w aplikacji pacjenta) dałby pacjentowi
 * inną wartość: katalog ma tu liczbę > 0 albo, przy przerwie między seriami bez wartości w katalogu, kanon 60 s.
 * Przy braku wartości w katalogu kreator i tak startuje od 0 dla czasu i przygotowania, więc takie 0 zostaje
 * `null`, żeby nieruszony nowy zestaw nie odciął dziedziczenia (#218).
 */
function toMappingDose(
  field: ZeroableField,
  value: number | null | undefined,
  catalog?: CatalogZeroableDose
): number | null {
  if (value !== 0) return toNullableNumber(value);
  const catalogValue = catalog?.[field];
  if (catalogValue == null) return field === 'restSets' && catalog ? 0 : null;
  return catalogValue > 0 ? 0 : null;
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
    frequency: input.frequency ? buildAssignmentFrequencyPayload(input.frequency) : DEFAULT_TEMPLATE_SET_FREQUENCY,
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
    duration: toMappingDose('duration', mapping.duration, mapping.catalog),
    restSets: toMappingDose('restSets', mapping.restSets, mapping.catalog),
    restReps: toMappingDose('restReps', mapping.restReps, mapping.catalog),
    preparationTime: toMappingDose('preparationTime', mapping.preparationTime, mapping.catalog),
    executionTime: toMappingDose('executionTime', mapping.executionTime, mapping.catalog),
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
