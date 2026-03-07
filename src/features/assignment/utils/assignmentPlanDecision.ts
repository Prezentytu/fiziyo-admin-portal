import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseLoad, ExerciseOverride, ExerciseSet, ExerciseMapping } from '../types';

export type AssignmentExecutionMode = 'UNCHANGED_TEMPLATE' | 'TEMPLATE_WITH_PARAM_OVERRIDES' | 'PERSONALIZED_PLAN';

export interface AssignmentPlanDecisionInput {
  sourceSet: ExerciseSet | null;
  isCreatingNewSet: boolean;
  planName: string;
  saveAsTemplate: boolean;
  builderInstances: ExerciseInstance[];
  builderParams: Map<string, ExerciseParams>;
}

export interface AssignmentPlanDecisionResult {
  mode: AssignmentExecutionMode;
  overridesByMappingId: Record<string, Omit<ExerciseOverride, 'exerciseMappingId'>>;
}

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeLoad(
  load: ExerciseLoad | null | undefined
): { type: ExerciseLoad['type']; value: number | null; unit: ExerciseLoad['unit'] | null; text: string | null } | null {
  if (!load) return null;
  return {
    type: load.type,
    value: load.value ?? null,
    unit: load.unit ?? null,
    text: normalizeText(load.text),
  };
}

function areLoadsEqual(left: ExerciseLoad | null | undefined, right: ExerciseLoad | null | undefined): boolean {
  const normalizedLeft = normalizeLoad(left);
  const normalizedRight = normalizeLoad(right);

  if (!normalizedLeft && !normalizedRight) return true;
  if (!normalizedLeft || !normalizedRight) return false;

  return (
    normalizedLeft.type === normalizedRight.type &&
    normalizedLeft.value === normalizedRight.value &&
    normalizedLeft.unit === normalizedRight.unit &&
    normalizedLeft.text === normalizedRight.text
  );
}

function resolveSourceLoad(mapping: ExerciseMapping): ExerciseLoad | undefined {
  if (mapping.load) return mapping.load;
  return mapping.exercise?.defaultLoad;
}

function resolveParamLoad(params: ExerciseParams | undefined, sourceLoad: ExerciseLoad | undefined): ExerciseLoad | undefined {
  if (params?.load) return params.load;

  if (params?.loadType && params.loadType.length > 0) {
    const nextType = params.loadType as ExerciseLoad['type'];
    if (nextType === 'weight' || nextType === 'band' || nextType === 'bodyweight' || nextType === 'other') {
      return {
        type: nextType,
        value: params.loadValue,
        unit: params.loadUnit as ExerciseLoad['unit'],
        text: params.loadText?.trim() || params.loadType,
      };
    }
  }

  return sourceLoad;
}

function buildSourceDefaults(mapping: ExerciseMapping) {
  const sourceExercise = mapping.exercise;

  return {
    sets: mapping.sets ?? sourceExercise?.defaultSets ?? sourceExercise?.sets ?? 3,
    reps: mapping.reps ?? sourceExercise?.defaultReps ?? sourceExercise?.reps ?? 10,
    duration: mapping.duration ?? sourceExercise?.defaultDuration ?? sourceExercise?.duration ?? null,
    restSets: mapping.restSets ?? sourceExercise?.defaultRestBetweenSets ?? sourceExercise?.restSets ?? 60,
    restReps: mapping.restReps ?? sourceExercise?.defaultRestBetweenReps ?? sourceExercise?.restReps ?? null,
    executionTime: mapping.executionTime ?? sourceExercise?.defaultExecutionTime ?? sourceExercise?.executionTime ?? null,
    tempo: normalizeText(mapping.tempo ?? sourceExercise?.tempo),
    notes: normalizeText(mapping.notes),
    load: resolveSourceLoad(mapping),
    customName: normalizeText(mapping.customName),
    customDescription: normalizeText(mapping.customDescription),
  };
}

function isTemplateSource(set: ExerciseSet): boolean {
  return set.kind === 'TEMPLATE' || set.isTemplate === true;
}

export function decideAssignmentPlanMode({
  sourceSet,
  isCreatingNewSet,
  planName,
  saveAsTemplate,
  builderInstances,
  builderParams,
}: AssignmentPlanDecisionInput): AssignmentPlanDecisionResult {
  if (!sourceSet || isCreatingNewSet || !isTemplateSource(sourceSet)) {
    return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
  }

  if (saveAsTemplate) {
    return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
  }

  if (normalizeText(planName) !== normalizeText(sourceSet.name)) {
    return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
  }

  const sourceMappings = sourceSet.exerciseMappings || [];
  if (builderInstances.length !== sourceMappings.length) {
    return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
  }

  const overridesByMappingId: Record<string, Omit<ExerciseOverride, 'exerciseMappingId'>> = {};

  for (let index = 0; index < sourceMappings.length; index += 1) {
    const sourceMapping = sourceMappings[index];
    const instance = builderInstances[index];
    const expectedInstanceId = `existing-${sourceMapping.id}`;

    if (!instance || instance.instanceId !== expectedInstanceId || instance.exerciseId !== sourceMapping.exerciseId) {
      return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
    }

    const params = builderParams.get(instance.instanceId);
    const sourceDefaults = buildSourceDefaults(sourceMapping);

    // Name/description changes are identity-level and should always fork to personalized plan.
    const changedCustomName = normalizeText(params?.customName) !== sourceDefaults.customName;
    const changedCustomDescription = normalizeText(params?.customDescription) !== sourceDefaults.customDescription;
    if (changedCustomName || changedCustomDescription) {
      return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
    }

    // Unsupported in assignment-level override path - must fork to preserve data.
    if (params?.exerciseSide !== undefined || params?.preparationTime !== undefined) {
      return { mode: 'PERSONALIZED_PLAN', overridesByMappingId: {} };
    }

    const nextValues = {
      sets: params?.sets ?? sourceDefaults.sets,
      reps: params?.reps ?? sourceDefaults.reps,
      duration: params?.duration ?? sourceDefaults.duration,
      restSets: params?.restSets ?? sourceDefaults.restSets,
      restReps: params?.restReps ?? sourceDefaults.restReps,
      executionTime: params?.executionTime ?? sourceDefaults.executionTime,
      tempo: normalizeText(params?.tempo ?? sourceDefaults.tempo),
      notes: normalizeText(params?.notes ?? sourceDefaults.notes),
      load: resolveParamLoad(params, sourceDefaults.load),
    };

    const mappingOverride: Omit<ExerciseOverride, 'exerciseMappingId'> = {};

    if (nextValues.sets !== sourceDefaults.sets) mappingOverride.sets = nextValues.sets ?? undefined;
    if (nextValues.reps !== sourceDefaults.reps) mappingOverride.reps = nextValues.reps ?? undefined;
    if (nextValues.duration !== sourceDefaults.duration) mappingOverride.duration = nextValues.duration ?? undefined;
    if (nextValues.restSets !== sourceDefaults.restSets) mappingOverride.restSets = nextValues.restSets ?? undefined;
    if (nextValues.restReps !== sourceDefaults.restReps) mappingOverride.restReps = nextValues.restReps ?? undefined;
    if (nextValues.executionTime !== sourceDefaults.executionTime) {
      mappingOverride.executionTime = nextValues.executionTime ?? undefined;
    }

    if (nextValues.tempo !== sourceDefaults.tempo) mappingOverride.tempo = nextValues.tempo ?? undefined;
    if (nextValues.notes !== sourceDefaults.notes) mappingOverride.notes = nextValues.notes ?? undefined;
    if (!areLoadsEqual(nextValues.load, sourceDefaults.load)) {
      mappingOverride.load = nextValues.load;
    }

    if (Object.keys(mappingOverride).length > 0) {
      overridesByMappingId[sourceMapping.id] = mappingOverride;
    }
  }

  const mode: AssignmentExecutionMode =
    Object.keys(overridesByMappingId).length > 0 ? 'TEMPLATE_WITH_PARAM_OVERRIDES' : 'UNCHANGED_TEMPLATE';

  return { mode, overridesByMappingId };
}
