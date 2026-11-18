import { readExerciseContent } from '../readExerciseContent';
import type { ExerciseExecutionCardData } from '../types';
import { PLAYER_HINT_CHUNK_MAX_CHARS } from '@/utils/playerHintChunks';
import { PLAYER_HINT_ROTATE_EVERY_SEC } from '@/utils/playerPhaseHints';
import {
  buildPlayerScript,
  playerScriptHintAt,
  SIDE_SWITCH_AUTO_START_SECONDS,
  type ExerciseSideType,
  type PlayerScript,
  type PlayerScriptGuidance,
  type PlayerScriptInput,
  type PlayerScriptStep,
} from '@/utils/playerScript';

/**
 * Model zakładki „Jak u pacjenta”: z parametrów ćwiczenia w podglądzie buduje scenariusz playera
 * (`@/utils/playerScript`, kopia z aplikacji) i liczy, co pacjent widzi w danej sekundzie przebiegu.
 */

export type PatientPreviewTone = 'prepare' | 'work' | 'rest' | 'paused';

export interface PatientPreviewSource {
  readonly input: PlayerScriptInput;
  readonly guidance: PlayerScriptGuidance;
  /** Liczba z pola „Powtórzenia”, przed mnożnikiem „naprzemiennie na stronę”. */
  readonly prescribedReps: number;
}

export interface PatientPreviewSideBadge {
  readonly side: 'left' | 'right';
  readonly word: 'Lewa' | 'Prawa';
  readonly detail: string | null;
}

/**
 * Pole paska serii jak `getTrackSegments` w aplikacji: jedno na serię, a przy ćwiczeniu na każdą stronę
 * jedno na każdą stronę każdej serii (L, P, L, P…). `label` to numer serii albo litera strony,
 * `pairEnd` = prawa strona serii, po której pasek ma większy odstęp.
 */
interface PatientPreviewTileBase {
  readonly key: string;
  readonly label: string;
  readonly pairEnd: boolean;
}

export type PatientPreviewTile =
  | (PatientPreviewTileBase & { readonly state: 'done' })
  | (PatientPreviewTileBase & { readonly state: 'future' })
  | (PatientPreviewTileBase & {
      readonly state: 'current';
      /**
       * Kafelki bieżącej serii: część pracy i przerwy za nią (0–1 kafelka). Przy ćwiczeniu naprzemiennym
       * kafelek to para lewa + prawa, jak `getRepTiles` w aplikacji; licznik dalej liczy ruchy.
       */
      readonly reps: ReadonlyArray<{ readonly work: number; readonly rest: number }>;
    });

export interface PatientPreviewFrame {
  readonly screen: 'start' | 'phase' | 'sideSwitch' | 'done';
  readonly tone: PatientPreviewTone;
  readonly phaseLabel: string;
  readonly hint: string;
  readonly timerText: string;
  /** „/12” przy odhaczaniu powtórzeń. */
  readonly timerSuffix: string;
  /** Postęp kroku 0–1 (pasek pod kartą, ekran zmiany strony). */
  readonly stepProgress: number;
  readonly stepRemainingSec: number;
  readonly side: PatientPreviewSideBadge | null;
  readonly set: number;
  readonly setsTotal: number;
  readonly rep: number;
  readonly repsTotal: number;
  readonly remainingSec: number;
  readonly isManual: boolean;
  readonly tiles: readonly PatientPreviewTile[];
  /** Postęp bieżącej serii 0–1 (wariant „pasek”). */
  readonly setProgress: number;
}

export interface PatientPreviewBlock {
  readonly label: string;
  readonly startSec: number;
  readonly durationSec: number;
  readonly tone: 'prepare' | 'work' | 'rest' | 'sideSwitch';
  /** Kreskowany pasek: czas szacunkowy (odhaczanie) albo poza czasem z listy (zmiana strony). */
  readonly hatched: boolean;
}

export interface PatientPreviewNote {
  readonly level: 'player' | 'fix' | 'info';
  readonly text: string;
}

const SIDE_TYPES: readonly ExerciseSideType[] = ['none', 'left', 'right', 'both', 'alternating'];
const MAX_PHASE_HINTS = 4;
const MANUAL_START_LABEL = 'Zacznij serię';

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeSide(side: string | undefined): ExerciseSideType {
  const normalized = side?.toLowerCase();
  return SIDE_TYPES.find((known) => known === normalized) ?? 'none';
}

function descriptionLines(description: string | null): string[] {
  if (!description?.trim()) return [];
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)-]\s*/, '').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [description.trim()];
}

/**
 * Recepta i wskazówki jak w aplikacji: czas powtórzenia z `executionTime`, a dla starego ćwiczenia na czas
 * z `duration` (`resolveExerciseExecutionTime`); „naprzemiennie na stronę” podwaja powtórzenia
 * (`resolveExerciseSideDose`); wskazówki jak `buildExercisePlayerGuidance`.
 */
export function resolvePatientPreviewSource(exercise: ExerciseExecutionCardData): PatientPreviewSource {
  const exerciseSide = normalizeSide(exercise.side);
  const prescribedReps = Math.max(1, Math.floor(positive(exercise.reps) || 1));
  const repsMultiplier = exerciseSide === 'alternating' && exercise.alternatingPerSide === true ? 2 : 1;
  const executionTimeSec = positive(exercise.executionTime) || (exercise.isTimeBased ? positive(exercise.duration) : 0);

  const content = readExerciseContent({
    enrichmentData: exercise.enrichment,
    patientDescription: exercise.patientDescriptionOverride || exercise.patientDescription,
  });
  const steps =
    content.instruction.steps.length > 0
      ? content.instruction.steps
      : descriptionLines(content.instruction.description);
  const cues = (phase: 'preparation' | 'work' | 'rest') =>
    content.cues.filter((cue) => cue.phase === phase).map((cue) => cue.text);

  return {
    prescribedReps,
    input: {
      sets: Math.max(1, Math.floor(positive(exercise.sets) || 1)),
      reps: prescribedReps * repsMultiplier,
      executionTimeSec,
      restSets: positive(exercise.restSets),
      restReps: positive(exercise.restReps),
      preparationTime: positive(exercise.preparationTime),
      exerciseSide,
    },
    guidance: {
      prepare: [...cues('preparation'), ...steps.slice(0, 2)].slice(0, MAX_PHASE_HINTS),
      work: cues('work').slice(0, MAX_PHASE_HINTS),
      rest: cues('rest').slice(0, MAX_PHASE_HINTS),
    },
  };
}

export function buildPatientPreviewScript(source: PatientPreviewSource): PlayerScript {
  return buildPlayerScript(source.input);
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds - 0.001));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function sideBadge(step: PlayerScriptStep, exerciseSide: ExerciseSideType): PatientPreviewSideBadge | null {
  if (step.side === null) return null;
  const word = step.side === 'left' ? 'Lewa' : 'Prawa';
  let detail: string | null = null;
  if (exerciseSide === 'both') detail = step.sidePhase === 'first' ? '1/2' : '2/2';
  else if (exerciseSide === 'alternating') detail = 'naprzemiennie';
  return { side: step.side, word, detail };
}

/** Krok widoczny w sekundzie `atSec`; kroki zerowej długości (ekran startu) pomija, po końcu `null`. */
function stepAt(script: PlayerScript, atSec: number): PlayerScriptStep | null {
  for (const step of script.steps) {
    if (step.durationSec > 0 && atSec >= step.startSec && atSec < step.startSec + step.durationSec) return step;
  }
  return null;
}

function startsNewPass(step: PlayerScriptStep): boolean {
  return (
    step.kind === 'sideSwitch' || (step.kind === 'prepare' && step.beforeRightSide) || step.restType === 'betweenSets'
  );
}

/** Najwięcej kafelków w bieżącej serii (`MAX_REP_TICKS` w aplikacji); więcej = pasek. */
export const MAX_PREVIEW_REP_TILES = 15;

/** Ruchów na kafelek jak `getMovesPerTile` w aplikacji: para przy naprzemiennym z parzystą liczbą ruchów. */
export function previewMovesPerTile(exerciseSide: ExerciseSideType, repsTotal: number): 1 | 2 {
  return exerciseSide === 'alternating' && repsTotal >= 2 && repsTotal % 2 === 0 ? 2 : 1;
}

function buildTiles(
  step: PlayerScriptStep,
  setsTotal: number,
  repsTotal: number,
  stepProgress: number,
  exerciseSide: ExerciseSideType
): PatientPreviewTile[] {
  const perSide = exerciseSide === 'both';
  const segments = perSide
    ? Array.from({ length: setsTotal * 2 }, (_unused, index) => ({
        set: Math.floor(index / 2) + 1,
        label: index % 2 === 0 ? 'L' : 'P',
        pairEnd: index % 2 === 1 && index < setsTotal * 2 - 1,
      }))
    : Array.from({ length: setsTotal }, (_unused, index) => ({
        set: index + 1,
        label: String(index + 1),
        pairEnd: false,
      }));
  const currentIndex = perSide ? (step.set - 1) * 2 + (step.sidePhase === 'second' ? 1 : 0) : step.set - 1;
  const fresh = startsNewPass(step) || step.kind === 'prepare';

  return segments.map((segment, index): PatientPreviewTile => {
    const base = { key: `${segment.set}-${segment.label}`, label: segment.label, pairEnd: segment.pairEnd };
    if (index < currentIndex) return { ...base, state: 'done' };
    if (index > currentIndex) return { ...base, state: 'future' };
    // Postęp w ruchach: zrobione przed bieżącym plus część bieżącego (praca) albo przerwa ładująca bieżący.
    const doneMoves = fresh ? 0 : step.rep - 1;
    const workMoves = !fresh && step.kind === 'work' && step.advance === 'timer' ? doneMoves + stepProgress : doneMoves;
    const restMoves = !fresh && step.restType === 'betweenReps' ? stepProgress : 0;
    const movesPerTile = previewMovesPerTile(exerciseSide, repsTotal);
    const cover = (moves: number, tileIndex: number) =>
      Math.min(Math.max(moves - tileIndex * movesPerTile, 0), movesPerTile) / movesPerTile;
    const reps = Array.from({ length: Math.ceil(repsTotal / movesPerTile) }, (_unused, tileIndex) => {
      const work = cover(workMoves, tileIndex);
      return { work, rest: cover(workMoves + restMoves, tileIndex) - work };
    });
    return { ...base, state: 'current', reps };
  });
}

/**
 * Co pacjent widzi w sekundzie `atSec` osi scenariusza. `started` = pacjent już stuknął start
 * (przed nim ekran „Gotowe do startu”), `paused` = pauza w trakcie.
 */
export function buildPatientPreviewFrame(
  source: PatientPreviewSource,
  script: PlayerScript,
  atSec: number,
  state: { readonly started: boolean; readonly paused: boolean }
): PatientPreviewFrame {
  const { input, guidance } = source;
  const first = script.steps[0];
  const atStart = atSec <= 0 && !state.started;
  const current = atStart ? first : stepAt(script, atSec);
  const done = current === null;
  const step = current ?? script.steps[script.steps.length - 1];
  const elapsed = atStart ? 0 : Math.max(0, atSec - step.startSec);
  const stepProgress = step.durationSec > 0 ? Math.min(1, elapsed / step.durationSec) : 0;
  const isManual = step.kind === 'work' && step.advance === 'tap';

  let screen: PatientPreviewFrame['screen'] = 'phase';
  if (done) screen = 'done';
  // Przed startem zawsze „Gotowe do startu”; odliczanie przygotowania rusza dopiero po stuknięciu.
  else if (atStart) screen = 'start';
  else if (step.kind === 'sideSwitch') screen = 'sideSwitch';

  let tone: PatientPreviewTone = step.kind === 'rest' || step.kind === 'prepare' ? step.kind : 'work';
  if (state.paused && !atStart) tone = 'paused';

  let phaseLabel = 'Ćwicz';
  if (tone === 'paused') phaseLabel = 'Pauza';
  else if (step.kind === 'prepare') phaseLabel = 'Przygotuj się';
  else if (step.kind === 'rest') phaseLabel = 'Odpocznij';
  else if (isManual && step.rep === 1) phaseLabel = MANUAL_START_LABEL;

  const stepRemainingSec = Math.max(0, step.durationSec - elapsed);
  let timerText = formatClock(stepRemainingSec);
  let timerSuffix = '';
  if (isManual) {
    timerText = String(step.rep - 1);
    timerSuffix = `/${input.reps}`;
  }

  const repsDone = step.kind === 'work' ? step.rep - 1 + (isManual ? 0 : stepProgress) : 0;
  return {
    screen,
    tone,
    phaseLabel,
    hint: playerScriptHintAt(step, guidance, elapsed) ?? '',
    timerText,
    timerSuffix,
    stepProgress: isManual ? (step.rep - 1) / input.reps : stepProgress,
    stepRemainingSec,
    side: sideBadge(step, input.exerciseSide),
    set: step.set,
    setsTotal: input.sets,
    rep: step.rep,
    repsTotal: input.reps,
    remainingSec: Math.max(0, script.timelineDurationSec - Math.max(0, atSec)),
    isManual,
    tiles: buildTiles(step, input.sets, input.reps, isManual ? 0 : stepProgress, input.exerciseSide),
    setProgress: done ? 1 : Math.min(1, repsDone / input.reps),
  };
}

function blockLabel(step: PlayerScriptStep, exerciseSide: ExerciseSideType): string {
  if (step.kind === 'prepare') return step.beforeRightSide ? 'Przygotowanie · prawa' : 'Przygotowanie';
  if (step.kind === 'sideSwitch') return 'Ekran „Prawa strona”';
  if (step.restType === 'betweenSets') return 'Przerwa między seriami';
  const sideSuffix = exerciseSide === 'both' ? (step.sidePhase === 'first' ? ' · lewa' : ' · prawa') : '';
  return `Seria ${step.set}${sideSuffix}`;
}

/** Oś przebiegu: kolejne kroki o tej samej etykiecie (powtórzenia i przerwy w serii) łączy w jeden blok. */
export function buildPatientPreviewBlocks(source: PatientPreviewSource, script: PlayerScript): PatientPreviewBlock[] {
  const blocks: PatientPreviewBlock[] = [];
  for (const step of script.steps) {
    if (step.durationSec <= 0) continue;
    const label = blockLabel(step, source.input.exerciseSide);
    const last = blocks[blocks.length - 1];
    if (last && last.label === label) {
      blocks[blocks.length - 1] = { ...last, durationSec: last.durationSec + step.durationSec };
      continue;
    }
    const tone: PatientPreviewBlock['tone'] =
      step.kind === 'sideSwitch'
        ? 'sideSwitch'
        : step.kind === 'prepare'
          ? 'prepare'
          : step.restType === 'betweenSets'
            ? 'rest'
            : 'work';
    blocks.push({
      label,
      startSec: step.startSec,
      durationSec: step.durationSec,
      tone,
      hatched: step.kind === 'sideSwitch' || (step.kind === 'work' && step.advance === 'tap'),
    });
  }
  return blocks;
}

/** Co pacjent zobaczy inaczej, niż fizjoterapeuta wpisał w parametrach i wskazówkach. */
export function buildPatientPreviewNotes(source: PatientPreviewSource, script: PlayerScript): PatientPreviewNote[] {
  const { input, guidance } = source;
  const notes: PatientPreviewNote[] = [];
  const isTimed = input.executionTimeSec > 0;
  const onlyFirstWorkCue = isTimed && input.executionTimeSec < PLAYER_HINT_ROTATE_EVERY_SEC && guidance.work.length > 1;

  if (onlyFirstWorkCue) {
    notes.push({
      level: 'player',
      text: `Powtórzenie trwa ${input.executionTimeSec} s, a wskazówka zmienia się co ${PLAYER_HINT_ROTATE_EVERY_SEC} s, licząc od początku każdego powtórzenia. W pracy pacjent zobaczy tylko pierwszą wskazówkę („${guidance.work[0]}”).`,
    });
  }
  guidance.work.forEach((cue, index) => {
    if (cue.length <= PLAYER_HINT_CHUNK_MAX_CHARS || (onlyFirstWorkCue && index > 0)) return;
    notes.push({
      level: 'fix',
      text: `Wskazówka pracy ${index + 1} ma ${cue.length} znaków, a karta playera mieści ${PLAYER_HINT_CHUNK_MAX_CHARS}. Pacjent zobaczy ją w częściach albo skróconą.`,
    });
  });

  if (input.preparationTime > 0) {
    const prepareHints = guidance.prepare.length;
    const slots = Math.max(1, Math.ceil(input.preparationTime / PLAYER_HINT_ROTATE_EVERY_SEC));
    if (prepareHints > slots) {
      notes.push({
        level: 'info',
        text: `Przygotowanie trwa ${input.preparationTime} s, a wskazówki zmieniają się co ${PLAYER_HINT_ROTATE_EVERY_SEC} s. Na starcie pacjent zobaczy ${slots} z ${prepareHints} wskazówek przygotowania.`,
      });
    }
  } else if (input.exerciseSide === 'both') {
    notes.push({
      level: 'info',
      text: `Bez czasu przygotowania przed prawą stroną pojawia się ekran „Prawa strona”, który po ${SIDE_SWITCH_AUTO_START_SECONDS} s sam rusza dalej. Lista pacjenta pokazuje ${formatClock(script.plannedDurationSec)}, a realnie wychodzi ${formatClock(script.timelineDurationSec)}.`,
    });
  }

  if (!isTimed) {
    notes.push({
      level: 'info',
      text: `Bez czasu powtórzenia pacjent sam odhacza powtórzenia. Czas ${formatClock(script.plannedDurationSec)} to oszacowanie (3 s na powtórzenie).`,
    });
  }
  if (guidance.rest.length === 0 && script.steps.some((step) => step.kind === 'rest')) {
    notes.push({
      level: 'info',
      text: 'Brak wskazówek na przerwę. W przerwie pacjent zobaczy ogólne podpowiedzi aplikacji, np. „Rozluźnij mięśnie”.',
    });
  }
  return notes;
}

export interface PatientPreviewDetailSection {
  readonly title: string;
  readonly lines: readonly string[];
  readonly numbered: boolean;
}

export interface PatientPreviewDetails {
  readonly summary: string | null;
  readonly sections: readonly PatientPreviewDetailSection[];
  readonly parameters: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

const SIDE_LABEL: Record<ExerciseSideType, string> = {
  none: 'Bez podziału na strony',
  left: 'Lewa strona',
  right: 'Prawa strona',
  both: 'Każda strona osobno',
  alternating: 'Naprzemiennie',
};

/**
 * Rozwinięty dolny panel playera (`ExerciseBottomSheet` w aplikacji): te same sekcje w tej samej kolejności,
 * na końcu „Podstawowe parametry”. Pusta sekcja znika jak w aplikacji.
 */
export function buildPatientPreviewDetails(
  exercise: ExerciseExecutionCardData,
  source: PatientPreviewSource,
  script: PlayerScript
): PatientPreviewDetails {
  const content = readExerciseContent({
    enrichmentData: exercise.enrichment,
    patientDescription: exercise.patientDescriptionOverride || exercise.patientDescription,
    equipment: exercise.equipment,
  });
  const steps =
    content.instruction.steps.length > 0
      ? content.instruction.steps
      : descriptionLines(content.instruction.description);
  const section = (title: string, lines: ReadonlyArray<string | null | undefined>, numbered = false) => ({
    title,
    lines: lines.map((line) => line?.trim() ?? '').filter(Boolean),
    numbered,
  });

  const sections = [
    section('Po co', [content.why]),
    section('Kiedy', [content.whenToDo]),
    section(
      'Sprzęt',
      content.equipment.map((item) => item.label)
    ),
    section('Kroki wykonania', content.instruction.steps.length > 0 ? steps : [], true),
    section('Oddech', [content.breathing?.text]),
    section('Bezpieczeństwo', [content.stopIf]),
    section('Co możesz poczuć', [
      content.shouldFeel ? `Powinno być: ${content.shouldFeel}` : null,
      content.shouldNotFeel ? `Nie powinno być: ${content.shouldNotFeel}` : null,
    ]),
    section(
      'Najczęstsze błędy',
      content.mistakes.map((item) => (item.fix ? `${item.mistake} -> ${item.fix}` : item.mistake))
    ),
    section(
      'Wskazówki prowadzące',
      content.cues.map((cue) => cue.text),
      true
    ),
    section('Łatwiej', [content.easier]),
    section('Trudniej', [content.harder]),
  ].filter((item) => item.lines.length > 0);

  const { input } = source;
  const perSide = input.exerciseSide === 'both' || input.exerciseSide === 'alternating' ? ' na stronę' : '';
  const parameters = [
    { label: 'Serie', value: String(input.sets) },
    { label: 'Powtórzenia', value: `${source.prescribedReps}${perSide}` },
    input.executionTimeSec > 0
      ? { label: 'Czas powtórzenia', value: `${input.executionTimeSec} s` }
      : { label: 'Liczenie', value: 'odhaczane przyciskiem ✓' },
    input.restReps > 0 ? { label: 'Przerwa między powtórzeniami', value: `${input.restReps} s` } : null,
    input.sets > 1 && input.restSets > 0 ? { label: 'Przerwa między seriami', value: `${input.restSets} s` } : null,
    input.preparationTime > 0 ? { label: 'Przygotowanie', value: `${input.preparationTime} s` } : null,
    input.exerciseSide !== 'none' ? { label: 'Strona', value: SIDE_LABEL[input.exerciseSide] } : null,
    { label: 'Szacowany czas', value: `~${formatClock(script.plannedDurationSec)}` },
  ].filter((item): item is { label: string; value: string } => item !== null);

  const summary =
    content.instruction.summary ?? (content.instruction.steps.length > 0 ? null : content.instruction.description);
  return { summary: summary?.trim() || null, sections, parameters };
}
