import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';

export interface ExerciseMappingSnapshot {
  mappingId: string;
  exerciseId: string;
  order: number;
  params: ExerciseParams;
}

export interface ExerciseDiffAddedItem {
  instance: ExerciseInstance;
  order: number;
  params: ExerciseParams;
}

export interface ExerciseDiffUpdatedItem {
  mappingId: string;
  exerciseId: string;
  order: number;
  params: ExerciseParams;
}

export interface ExerciseDiffResult {
  added: ExerciseDiffAddedItem[];
  removed: ExerciseMappingSnapshot[];
  updated: ExerciseDiffUpdatedItem[];
}

interface CurrentExerciseState {
  instances: ExerciseInstance[];
  params: Map<string, ExerciseParams>;
}

const EXISTING_PREFIX = 'existing-';

function getMappingIdFromInstanceId(instanceId: string): string | null {
  if (!instanceId.startsWith(EXISTING_PREFIX)) {
    return null;
  }

  const mappingId = instanceId.slice(EXISTING_PREFIX.length);
  return mappingId.length > 0 ? mappingId : null;
}

function normalizeString(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeParams(params?: ExerciseParams): ExerciseParams {
  return {
    sets: params?.sets ?? undefined,
    reps: params?.reps ?? undefined,
    duration: params?.duration ?? undefined,
    restSets: params?.restSets ?? undefined,
    restReps: params?.restReps ?? undefined,
    preparationTime: params?.preparationTime ?? undefined,
    executionTime: params?.executionTime ?? undefined,
    notes: normalizeString(params?.notes) ?? undefined,
    customName: normalizeString(params?.customName) ?? undefined,
    customDescription: normalizeString(params?.customDescription) ?? undefined,
    tempo: normalizeString(params?.tempo) ?? undefined,
    loadType: normalizeString(params?.loadType) ?? undefined,
    loadValue: params?.loadValue ?? undefined,
    loadUnit: normalizeString(params?.loadUnit) ?? undefined,
    loadText: normalizeString(params?.loadText) ?? undefined,
  };
}

function areParamsEqual(left?: ExerciseParams, right?: ExerciseParams): boolean {
  return JSON.stringify(normalizeParams(left)) === JSON.stringify(normalizeParams(right));
}

export function computeExerciseDiff(initial: ExerciseMappingSnapshot[], current: CurrentExerciseState): ExerciseDiffResult {
  const initialByMappingId = new Map(initial.map((item) => [item.mappingId, item]));

  const existingMappingIds = new Set<string>();
  const added: ExerciseDiffAddedItem[] = [];
  const updated: ExerciseDiffUpdatedItem[] = [];

  current.instances.forEach((instance, index) => {
    const order = index + 1;
    const currentParams = normalizeParams(current.params.get(instance.instanceId));
    const mappingId = getMappingIdFromInstanceId(instance.instanceId);

    if (!mappingId) {
      added.push({
        instance,
        order,
        params: currentParams,
      });
      return;
    }

    existingMappingIds.add(mappingId);

    const initialSnapshot = initialByMappingId.get(mappingId);
    if (!initialSnapshot) {
      added.push({
        instance,
        order,
        params: currentParams,
      });
      return;
    }

    const hasOrderChanged = initialSnapshot.order !== order;
    const hasParamsChanged = !areParamsEqual(initialSnapshot.params, currentParams);

    if (hasOrderChanged || hasParamsChanged) {
      updated.push({
        mappingId,
        exerciseId: instance.exerciseId,
        order,
        params: currentParams,
      });
    }
  });

  const removed = initial.filter((item) => !existingMappingIds.has(item.mappingId));

  return {
    added,
    removed,
    updated,
  };
}
