import {
  getExerciseDefaultParams,
  type ExerciseLikeForDefaults,
} from '@/features/exercise-sets/utils/exerciseDefaults';
import { format } from 'date-fns';

import { DEFAULT_SCHEDULE_PLAN, planWeeksLabel } from './schedulePlan';
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
  /** Rekord ćwiczenia w 3.3: „naprzemiennie” liczy się na stronę. Ustawiane przy karcie, z treści ćwiczenia. */
  alternatingPerSide?: boolean;
}

/** Numbers a source wrote for an exercise (a visit note's "3×15"); they win over the catalog defaults. */
export interface DraftDose {
  sets?: number;
  reps?: number;
  duration?: number;
}

export function applyDose(item: DraftItem, dose: DraftDose | undefined): DraftItem {
  if (!dose) return item;
  const sets = dose.sets ?? item.sets;
  // "3 × 30 s" without repetitions is one held repetition per series: the player counts
  // `executionTime`, and `duration` is legacy, so the note's time goes there.
  if (dose.duration !== undefined && dose.reps === undefined) {
    return { ...item, sets, reps: 1, executionTime: dose.duration, duration: 0 };
  }
  return { ...item, sets, reps: dose.reps ?? item.reps };
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
    alternatingPerSide: item.alternatingPerSide === true,
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
  return `Od kiedy i jak często? Proponuję od jutra, przez ${planWeeksLabel(DEFAULT_SCHEDULE_PLAN.weeks)}, codziennie (ok. ${draftMinutes(items)} min dziennie).`;
}

/** "3 × 10 · 5 s powtórzenie" or "3 × 30 s" when a series is held for a time. */
export function formatDraftParams(item: DraftItem): string {
  const heldSeconds = item.duration > 0 ? item.duration : item.executionTime;
  const isHeld = item.reps <= 1 && heldSeconds > 0;
  const series = isHeld ? `${item.sets} × ${heldSeconds} s` : `${item.sets} × ${item.reps}`;
  const repetition = item.executionTime > 0 && !isHeld ? ` · ${item.executionTime} s powtórzenie` : '';
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

const SEND_GUARD = 'do pacjenta nic nie trafi przed kliknięciem „Wyślij”.';

/** Under the draft: a set composed in the thread is not a catalog set, so it is never called one. */
export function draftNote(options: { fromCatalog: boolean; hasPatient: boolean }): string {
  if (options.fromCatalog) {
    return options.hasPatient
      ? `Zestaw z katalogu, a nie zalecenie dla tej osoby. Decyzja należy do Ciebie: ${SEND_GUARD}`
      : `Zestaw z katalogu gabinetu. Decyzja należy do Ciebie: ${SEND_GUARD}`;
  }
  return options.hasPatient
    ? `Zestaw tylko dla tego pacjenta, poza katalogiem gabinetu. Decyzja należy do Ciebie: ${SEND_GUARD}`
    : `Nowy zestaw poza katalogiem. Wybierz pacjenta albo zapisz zestaw w katalogu gabinetu; ${SEND_GUARD}`;
}

/** Under the summary: a catalog set is copied into the plan, a composed one exists only there. */
export function planNote(fromCatalog: boolean): string {
  return fromCatalog
    ? 'Plan pacjenta to kopia zestawu: zmiany tutaj nie ruszają katalogu.'
    : 'Plan tylko dla tego pacjenta: zestaw nie trafi do katalogu gabinetu.';
}

export function savedInCatalogText(name: string): string {
  return `Zapisane w katalogu gabinetu jako „${name}”. Możesz go teraz przypisać dowolnemu pacjentowi.`;
}

const MAX_NAME_LENGTH = 80;

// The name travels to the patient's app, the catalogue and the PDF, so it never carries
// the patient's personal data; the assignment already says whose plan it is.
export function proposeDraftName(options: { setName?: string; topic?: string; today?: Date }): string {
  const name =
    options.setName?.trim() ||
    capitalize(options.topic?.trim()) ||
    `Nowy zestaw · ${format(options.today ?? new Date(), 'dd.MM')}`;
  return name.slice(0, MAX_NAME_LENGTH);
}

function capitalize(value: string | undefined): string {
  if (!value) return '';
  return value.charAt(0).toLocaleUpperCase('pl-PL') + value.slice(1);
}
