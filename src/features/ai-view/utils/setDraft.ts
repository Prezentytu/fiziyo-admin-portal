import {
  getExerciseDefaultParams,
  type ExerciseLikeForDefaults,
} from '@/features/exercise-sets/utils/exerciseDefaults';
import type { ExerciseMappingSubmitInput } from '@/features/exercise-sets/utils/createSetSubmit';
import type { ExerciseParameterValues } from '@/components/shared/exercise/ExerciseParametersFields';
import { calculateEstimatedTime } from '@/utils/exerciseTime';

/** One exercise of a set being composed in chat; the numbers are what the patient will get. */
export interface DraftItem {
  exerciseId: string;
  sets: number;
  reps: number;
  duration: number;
  executionTime: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  side?: string;
  tempo?: string;
  loadKg?: number;
  notes?: string;
}

/** A set the therapist is composing in the thread; JSON-safe, so it survives a reload of the conversation. */
export interface SetDraftPayload {
  name: string;
  patientId?: string;
  /** Catalog set the draft started from (kept as `sourceExerciseSetId` on the patient plan). */
  sourceSetId?: string;
  items: DraftItem[];
}

const NUMERIC_KEYS = ['sets', 'reps', 'duration', 'executionTime', 'restSets', 'restReps', 'preparationTime'] as const;

/** What the shared parameter editor (`ExerciseParametersFields`) shows for a draft row. */
export function draftParameterValues(item: DraftItem): ExerciseParameterValues {
  return {
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    executionTime: item.executionTime,
    restSets: item.restSets,
    restReps: item.restReps,
    preparationTime: item.preparationTime,
    tempo: item.tempo ?? '',
    loadKg: item.loadKg ?? null,
    notes: item.notes ?? '',
  };
}

/** The editor's patch on a draft row; a cleared number means none of it (0). */
export function applyParameterPatch(item: DraftItem, patch: Partial<ExerciseParameterValues>): DraftItem {
  const next: DraftItem = { ...item };
  for (const key of NUMERIC_KEYS) {
    if (key in patch) next[key] = Math.max(0, patch[key] ?? 0);
  }
  if ('tempo' in patch) next.tempo = patch.tempo || undefined;
  if ('loadKg' in patch) next.loadKg = patch.loadKg ?? undefined;
  if ('notes' in patch) next.notes = patch.notes || undefined;
  return next;
}

export function draftItemFromExercise(exercise: ExerciseLikeForDefaults & { id: string }): DraftItem {
  const params = getExerciseDefaultParams(exercise);
  return {
    exerciseId: exercise.id,
    sets: params.sets,
    reps: params.reps,
    duration: params.duration,
    executionTime: params.executionTime,
    restSets: params.restSets,
    restReps: params.restReps,
    preparationTime: params.preparationTime,
    side: params.exerciseSide,
  };
}

interface MappingLike {
  exerciseId: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  tempo?: string | null;
  notes?: string | null;
  load?: { loadWeightKg?: number | null } | null;
}

/** A catalog set's mapping wins over the exercise defaults, as in the assignment wizard. */
export function draftItemFromMapping(
  mapping: MappingLike,
  exercise?: ExerciseLikeForDefaults & { id: string }
): DraftItem {
  const base = exercise ? draftItemFromExercise(exercise) : draftItemFromExercise({ id: mapping.exerciseId });
  return {
    ...base,
    sets: mapping.sets ?? base.sets,
    reps: mapping.reps ?? base.reps,
    duration: mapping.duration ?? base.duration,
    executionTime: mapping.executionTime ?? base.executionTime,
    restSets: mapping.restSets ?? base.restSets,
    restReps: mapping.restReps ?? base.restReps,
    preparationTime: mapping.preparationTime ?? base.preparationTime,
    tempo: mapping.tempo || undefined,
    notes: mapping.notes || undefined,
    loadKg: mapping.load?.loadWeightKg ?? undefined,
  };
}

export function itemSeconds(item: DraftItem): number {
  return calculateEstimatedTime({
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    executionTime: item.executionTime,
    rest: item.restSets,
    restReps: item.restReps,
    preparationTime: item.preparationTime,
    side: item.side,
  });
}

export function itemMinutes(item: DraftItem): number {
  return Math.max(1, Math.round(itemSeconds(item) / 60));
}

/** "dziennie ok. 18 min" uses the same estimate as the player, rounded up for the whole set. */
export function draftMinutes(items: readonly DraftItem[]): number {
  if (items.length === 0) return 0;
  return Math.max(1, Math.ceil(items.reduce((sum, item) => sum + itemSeconds(item), 0) / 60));
}

/** The question that opens the schedule step; it proposes the default plan (DEFAULT_SCHEDULE_PLAN). */
export function scheduleQuestion(items: readonly DraftItem[]): string {
  return `Od kiedy i jak często? Proponuję od jutra, przez 4 tygodnie, codziennie (ok. ${draftMinutes(items)} min dziennie).`;
}

/** "3 × 10 · 5 s powtórzenie" or "3 × 30 s" when a series is held for a time. */
export function formatDraftParams(item: DraftItem): string {
  const series =
    item.duration > 0 && item.reps <= 1 ? `${item.sets} × ${item.duration} s` : `${item.sets} × ${item.reps}`;
  const repetition =
    item.executionTime > 0 && !(item.duration > 0 && item.reps <= 1) ? ` · ${item.executionTime} s powtórzenie` : '';
  const rest = item.restSets > 0 ? ` · przerwa ${item.restSets} s` : '';
  return `${series}${repetition}${rest}`;
}

export function toMappingInput(item: DraftItem): ExerciseMappingSubmitInput {
  return {
    exerciseId: item.exerciseId,
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    executionTime: item.executionTime,
    restSets: item.restSets,
    restReps: item.restReps,
    preparationTime: item.preparationTime,
    tempo: item.tempo ?? null,
    loadWeightKg: item.loadKg ?? null,
    notes: item.notes ?? null,
  };
}

const MAX_NAME_LENGTH = 80;

/** "Kolano po ACL · Jan Kowalski": the topic the therapist wrote, then whose plan it is. */
export function proposeDraftName(options: { setName?: string; topic?: string; patientName?: string }): string {
  const base = options.setName?.trim() || capitalize(options.topic?.trim()) || 'Nowy zestaw';
  const name = options.patientName ? `${base} · ${options.patientName}` : base;
  return name.slice(0, MAX_NAME_LENGTH);
}

function capitalize(value: string | undefined): string {
  if (!value) return '';
  return value.charAt(0).toLocaleUpperCase('pl-PL') + value.slice(1);
}
