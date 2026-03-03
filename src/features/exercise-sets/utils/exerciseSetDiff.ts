/**
 * Computes diff between initial exercise set state (from API) and final state (from builder)
 * to determine which mutations to run: remove, update, add.
 */

import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';

const EXISTING_PREFIX = 'existing-';

/** Mapping as returned by GET_EXERCISE_SET_WITH_ASSIGNMENTS (minimal shape for diff). */
export interface InitialMapping {
  id: string;
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  notes?: string;
  customName?: string;
  customDescription?: string;
  tempo?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
}

export interface ExerciseSetDiffInput {
  initialMappings: InitialMapping[];
  selectedInstances: ExerciseInstance[];
  exerciseParams: Map<string, ExerciseParams>;
}

export interface ToRemoveItem {
  mappingId: string;
  exerciseId: string;
}

export interface ToAddItem {
  order: number;
  exerciseId: string;
  params: ExerciseParams;
}

export interface ToUpdateItem {
  mappingId: string;
  exerciseId: string;
  order: number;
  params: ExerciseParams;
}

export interface ExerciseSetDiffResult {
  toRemove: ToRemoveItem[];
  toUpdate: ToUpdateItem[];
  toAdd: ToAddItem[];
}

/**
 * Parses mapping id from builder instanceId for existing items.
 * Format: "existing-{mappingId}-{index}".
 */
export function parseExistingInstanceId(instanceId: string): { mappingId: string; index: number } | null {
  if (!instanceId.startsWith(EXISTING_PREFIX)) return null;
  const rest = instanceId.slice(EXISTING_PREFIX.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash === -1) return null;
  const indexStr = rest.slice(lastDash + 1);
  const index = Number.parseInt(indexStr, 10);
  if (Number.isNaN(index)) return null;
  const mappingId = rest.slice(0, lastDash);
  return { mappingId, index };
}

function paramsEqual(a: ExerciseParams, b: ExerciseParams): boolean {
  const keys: (keyof ExerciseParams)[] = [
    'sets',
    'reps',
    'duration',
    'restSets',
    'restReps',
    'preparationTime',
    'executionTime',
    'notes',
    'customName',
    'customDescription',
    'tempo',
    'loadType',
    'loadValue',
    'loadUnit',
    'loadText',
  ];
  for (const key of keys) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (va == null || vb == null) return false;
    if (typeof va === 'object' || typeof vb === 'object') return false;
    if (String(va) !== String(vb)) return false;
  }
  return true;
}

/**
 * Builds initial params from a mapping for comparison.
 */
function mappingToParams(m: InitialMapping): ExerciseParams {
  return {
    sets: m.sets,
    reps: m.reps,
    duration: m.duration,
    restSets: m.restSets,
    restReps: m.restReps,
    preparationTime: m.preparationTime,
    executionTime: m.executionTime,
    notes: m.notes ?? '',
    customName: m.customName ?? '',
    customDescription: m.customDescription ?? '',
    tempo: m.tempo ?? '',
    loadType: m.loadType ?? '',
    loadValue: m.loadValue ?? 0,
    loadUnit: m.loadUnit ?? 'kg',
    loadText: m.loadText ?? '',
  };
}

export interface ExerciseSetChangeInput {
  name: string;
  description: string;
  initialName: string;
  initialDescription: string;
  diff: ExerciseSetDiffResult;
}

/** Returns true if anything changed compared to initial state (name, description, or exercises). */
export function hasExerciseSetChanges({
  name,
  description,
  initialName,
  initialDescription,
  diff,
}: ExerciseSetChangeInput): boolean {
  return (
    name.trim() !== initialName ||
    (description ?? '') !== initialDescription ||
    diff.toRemove.length > 0 ||
    diff.toUpdate.length > 0 ||
    diff.toAdd.length > 0
  );
}

/**
 * Computes diff between initial set state and current builder state.
 */
export function computeExerciseSetDiff(input: ExerciseSetDiffInput): ExerciseSetDiffResult {
  const { initialMappings, selectedInstances, exerciseParams } = input;

  const initialById = new Map(initialMappings.map((m) => [m.id, m]));
  const initialMappingIds = new Set(initialMappings.map((m) => m.id));

  const finalExistingIds = new Set<string>();
  const toRemove: ToRemoveItem[] = [];
  const toUpdate: ToUpdateItem[] = [];
  const toAdd: ToAddItem[] = [];

  selectedInstances.forEach((instance, index) => {
    const order = index + 1;
    const params = exerciseParams.get(instance.instanceId) ?? {};
    const parsed = parseExistingInstanceId(instance.instanceId);

    if (parsed) {
      finalExistingIds.add(parsed.mappingId);
      const initial = initialById.get(parsed.mappingId);
      if (!initial) return;
      const initialParams = mappingToParams(initial);
      const initialOrder = initial.order ?? order;
      const orderChanged = initialOrder !== order;
      const paramsChanged = !paramsEqual(initialParams, params);
      if (orderChanged || paramsChanged) {
        toUpdate.push({
          mappingId: parsed.mappingId,
          exerciseId: instance.exerciseId,
          order,
          params,
        });
      }
    } else {
      toAdd.push({ order, exerciseId: instance.exerciseId, params });
    }
  });

  initialMappingIds.forEach((mappingId) => {
    if (!finalExistingIds.has(mappingId)) {
      const m = initialById.get(mappingId);
      if (m) toRemove.push({ mappingId, exerciseId: m.exerciseId });
    }
  });

  return { toRemove, toUpdate, toAdd };
}
