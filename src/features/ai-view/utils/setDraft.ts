import {
  getCatalogZeroableDose,
  getExerciseDefaultParams,
  type CatalogZeroableDose,
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
  /** Wartości katalogu, z którymi zapis porównuje wpisane 0 (#218). Brak w starszych szkicach rozmowy. */
  catalog?: CatalogZeroableDose;
  /** SPEC-061: rozgrzewka zaproponowana przez asystenta; po zapisie idzie do `updateExerciseSetDependencies`. */
  isWarmup?: boolean;
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
    catalog: getCatalogZeroableDose(exercise),
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
  const base = exercise
    ? draftItemFromExercise(exercise)
    : // Bez rekordu katalogu jego wartości są nieznane, a nie puste: zapis zachowuje się jak przed #218.
      { ...draftItemFromExercise({ id: mapping.exerciseId }), catalog: undefined };
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
    catalog: item.catalog,
  };
}

const SEND_GUARD = 'Pacjent nic nie dostanie, dopóki nie klikniesz „Wyślij”.';

/** Behind the ⓘ next to the draft's title, in plain words: what this set is and that nothing goes out by itself. */
export function draftNote(options: { fromCatalog: boolean; hasPatient: boolean }): string {
  if (options.fromCatalog) {
    return options.hasPatient
      ? `Zestaw z katalogu, nie ułożony pod tę osobę. Sprawdź, czy pasuje. ${SEND_GUARD}`
      : `Zestaw z katalogu gabinetu. ${SEND_GUARD}`;
  }
  return options.hasPatient
    ? `Ten zestaw jest tylko dla tego pacjenta i nie trafi do katalogu. ${SEND_GUARD}`
    : `To na razie szkic. Możesz go zapisać w katalogu albo od razu wybrać pacjenta. ${SEND_GUARD}`;
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
export function proposeDraftName(options: {
  setName?: string;
  topic?: string;
  today?: Date;
  /** Names of people in the thread: a topic that mentions one is not used. */
  avoid?: readonly string[];
}): string {
  const date = format(options.today ?? new Date(), 'dd.MM');
  const topic = draftTopic(options.topic, options.avoid);
  const name = options.setName?.trim() || (topic ? `${capitalize(topic)} · ${date}` : `Nowy zestaw · ${date}`);
  return name.slice(0, MAX_NAME_LENGTH);
}

/** „Zestaw na ból karku” → „ból karku”; nothing when the topic names a person from the thread. */
export function draftTopic(topic: string | undefined, avoid: readonly string[] = []): string {
  const cleaned = (topic ?? '')
    .trim()
    // Pierwsze zdanie albo człon: „Pacjent z utykaniem, bez rozpoznania; zestaw ogólny…” → „Pacjent z utykaniem”.
    .split(/[;,.]/)[0]
    .replace(
      /^(?:(?:szkic|propozycja|ogólny|ogolny)\s+)*(?:(?:zestaw|plan|program)(?:u|y)?\s+)?(?:(?:ćwiczeń|cwiczen)\s+)?/i,
      ''
    )
    // „dla <osoba> przy …” mówi o kim, nie o czym; nazwa nigdy nie niesie osoby.
    .replace(/^(?:dla|do)\s+(?:\S+\s+){0,3}?(?=(?:przy|na|po|z|ze|w|od)\s)/i, '')
    .replace(/^(?:dla|do)\s+.*$/i, '')
    .replace(/^(?:pacjent\p{L}*)\s+/iu, '')
    .replace(/^na\s+/i, '')
    .replace(/[!?]+$/, '')
    .trim();
  if (!cleaned) return '';
  // Imiona się odmieniają („Anna” → „Anny”), więc porównujemy rdzeń: słowo tematu zaczyna się jak część imienia.
  const words = cleaned.toLocaleLowerCase('pl-PL').split(/[\s,.;:]+/);
  const mentionsPerson = avoid.some((name) =>
    name
      .toLocaleLowerCase('pl-PL')
      .split(/\s+/)
      .filter((part) => part.length > 2)
      .some((part) => {
        const stem = part.slice(0, Math.max(3, part.length - 2));
        return words.some((word) => word.startsWith(stem));
      })
  );
  return mentionsPerson ? '' : cleaned;
}

/** Limit kolumny `ExerciseSet.Description` w backendzie (`StringLength(300)`). */
export const MAX_SET_DESCRIPTION_LENGTH = 300;

/**
 * Catalog description of a set composed in the chat: only the topic, no personal data; empty without a topic.
 * Opis to tekst, który się nie przelicza: czas dzienny, data ułożenia i lista ćwiczeń rozjeżdżały się z zestawem
 * po pierwszej edycji. Skład i dawki pokazuje zestaw, historię log zestawu (SPEC-063 w fizjo-app).
 */
export function proposeDraftDescription(options: { topic?: string; avoid?: readonly string[] }): string {
  const topic = draftTopic(options.topic, options.avoid);
  if (!topic) return '';
  const text = `${capitalize(topic)}.`;
  return text.length <= MAX_SET_DESCRIPTION_LENGTH ? text : `${text.slice(0, MAX_SET_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

function capitalize(value: string | undefined): string {
  if (!value) return '';
  return value.charAt(0).toLocaleUpperCase('pl-PL') + value.slice(1);
}

/** The set draft a new exercise returns to: its exercises and their sets, reps and hold times. */
export interface SetDraftReturn {
  exerciseIds: string[];
  patientId?: string;
  note?: string;
  doses?: Record<string, DraftDose>;
  /**
   * The whole rows (rests, tempo, load, notes, side, preparation), from 18.11. Drafts stored earlier
   * carry only `doses`, which stay for them.
   */
  items?: DraftItem[];
}

/** Sets, reps and hold time of each draft item, so a rebuilt draft keeps what the therapist set. */
export function itemsToDoses(items: readonly DraftItem[]): Record<string, DraftDose> {
  return Object.fromEntries(
    items.map((item) => {
      const held = item.reps <= 1 && item.executionTime > 0;
      return [
        item.exerciseId,
        held ? { sets: item.sets, duration: item.executionTime } : { sets: item.sets, reps: item.reps },
      ];
    })
  );
}

/** What an open proposal holds now, as a new card rebuilds it (a new exercise returns to it this way). */
export function draftReturnOf(
  items: readonly DraftItem[],
  options: { patientId?: string; note?: string }
): SetDraftReturn {
  return {
    exerciseIds: items.map((item) => item.exerciseId),
    patientId: options.patientId,
    note: options.note,
    doses: itemsToDoses(items),
    items: [...items],
  };
}
