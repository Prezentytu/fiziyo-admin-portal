import {
  PLAYER_HINT_ROTATE_EVERY_SEC,
  REPS_PLAYER_START_HINT,
  RIGHT_SIDE_PREPARATION_HINT,
  selectPhaseHint,
} from '@/utils/playerPhaseHints';

/** Strona ćwiczenia jak w aplikacji (`fizjo-app` `types/exercise.ts`). */
export type ExerciseSideType = 'none' | 'left' | 'right' | 'both' | 'alternating';

/** Recepta sesji playera jak `PlannedDurationInput` w `fizjo-app` `utils/exercisePlannedDuration.ts`. */
export interface PlayerScriptInput {
  sets: number;
  reps: number;
  executionTimeSec: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  exerciseSide: ExerciseSideType;
}

/** Ekran zmiany strony bez przygotowania sam rusza po tylu sekundach (`fizjo-app` `utils/restDuration.ts`). */
export const SIDE_SWITCH_AUTO_START_SECONDS = 5;

function sanitizeRestDuration(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric);
}

/**
 * Kopia `fizjo-app` `utils/playerScript.ts` (zmieniaj oba razem; wektory w `__tests__/fixtures` są wspólne).
 *
 * Scenariusz playera: kolejne kroki, które pacjent zobaczy od startu do końca ćwiczenia, bez pauz, pominięć
 * i cofnięć. Opisuje tę samą kolejność co trasa playera (`app/(tabs)/patient/sets/exercise-player`):
 *
 * - start: z czasem przygotowania odliczanie czeka na stuknięcie, bez niego ekran „Gotowe do startu”;
 * - seria: powtórzenia, między nimi przerwa `restReps` (po ostatnim powtórzeniu serii jej nie ma);
 * - `both`: w każdej serii lewa, potem prawa; prawą poprzedza przygotowanie, a bez niego ekran zmiany strony,
 *   który sam rusza po `SIDE_SWITCH_AUTO_START_SECONDS` i nie wchodzi do planowanego czasu;
 * - `alternating`: strona zmienia się po każdym powtórzeniu, licząc od lewej przez wszystkie serie;
 * - przerwa `restSets` między seriami, nie po ostatniej.
 *
 * Wejście to recepta sesji z trasy: `reps` już pomnożone przez `resolveExerciseSideDose(...).repsMultiplier`,
 * `executionTimeSec` z `resolveExerciseExecutionTime` (0 = pacjent sam odhacza powtórzenia).
 * Suma kroków z `countsInPlan` równa się `computePlannedDurationSec` (test w `utils/__tests__/playerScript.test.ts`).
 * Portal odtwarza z tego scenariusza podgląd „Jak u pacjenta”; wspólne wektory leżą w
 * `utils/__tests__/fixtures/playerScript.vectors.json` i są kopiowane do portalu bez zmian.
 */
export type PlayerScriptStepKind = 'start' | 'prepare' | 'work' | 'rest' | 'sideSwitch';
export type PlayerScriptSide = 'left' | 'right' | null;

export interface PlayerScriptStep {
  readonly kind: PlayerScriptStepKind;
  /** Seria widoczna na ekranie (w przerwie między seriami już następna). */
  readonly set: number;
  /** Powtórzenie widoczne na ekranie, od 1. */
  readonly rep: number;
  readonly side: PlayerScriptSide;
  /** `second` = prawa strona ćwiczenia `both`. */
  readonly sidePhase: 'first' | 'second';
  readonly restType: 'betweenReps' | 'betweenSets' | null;
  /** Prepare przed prawą stroną `both`. */
  readonly beforeRightSide: boolean;
  /** Sekunda osi scenariusza, w której krok się zaczyna. */
  readonly startSec: number;
  /** Czas kroku; przy `advance: 'tap'` w pracy to oszacowanie (3 s jak planowany czas), przy starcie 0. */
  readonly durationSec: number;
  /** Jak krok przechodzi dalej: sam po czasie albo po stuknięciu pacjenta. */
  readonly advance: 'timer' | 'tap';
  /** Odliczanie stoi, dopóki pacjent nie stuknie startu (przygotowanie na początku ćwiczenia). */
  readonly waitsForStartTap: boolean;
  /** Czy krok wchodzi do planowanego czasu (`computePlannedDurationSec`). */
  readonly countsInPlan: boolean;
}

export interface PlayerScript {
  readonly steps: readonly PlayerScriptStep[];
  /** Ten sam wynik co `computePlannedDurationSec`. */
  readonly plannedDurationSec: number;
  /** Długość całej osi, razem z ekranem zmiany strony. */
  readonly timelineDurationSec: number;
}

/** Wskazówki ćwiczenia na fazy, jak zwraca `buildExercisePlayerGuidance`. */
export interface PlayerScriptGuidance {
  readonly prepare: readonly string[];
  readonly work: readonly string[];
  readonly rest: readonly string[];
}

const MANUAL_REP_ESTIMATE_SEC = 3;

function sidesForSet(exerciseSide: ExerciseSideType): readonly ('first' | 'second')[] {
  return exerciseSide === 'both' ? ['first', 'second'] : ['first'];
}

function sideOf(
  exerciseSide: ExerciseSideType,
  sidePhase: 'first' | 'second',
  completedRepsSoFar: number
): PlayerScriptSide {
  switch (exerciseSide) {
    case 'left':
    case 'right':
      return exerciseSide;
    case 'both':
      return sidePhase === 'second' ? 'right' : 'left';
    case 'alternating':
      return completedRepsSoFar % 2 === 0 ? 'left' : 'right';
    default:
      return null;
  }
}

function positiveInt(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function buildPlayerScript(input: PlayerScriptInput): PlayerScript {
  const sets = positiveInt(input.sets, 1);
  const reps = positiveInt(input.reps, 1);
  const preparation = Math.max(0, Number.isFinite(input.preparationTime) ? input.preparationTime : 0);
  const restReps = sanitizeRestDuration(input.restReps);
  const restSets = sanitizeRestDuration(input.restSets);
  const isTimed = input.executionTimeSec > 0;
  const repSeconds = isTimed ? input.executionTimeSec : MANUAL_REP_ESTIMATE_SEC;

  const steps: PlayerScriptStep[] = [];
  let clock = 0;
  let planned = 0;
  // Naprzemiennie: strona liczy się z sumy odhaczonych powtórzeń wszystkich serii (`getExerciseSideProgress`).
  let alternatingCompleted = 0;

  const push = (step: Omit<PlayerScriptStep, 'startSec'>) => {
    steps.push({ ...step, startSec: clock });
    clock += step.durationSec;
    if (step.countsInPlan) planned += step.durationSec;
  };

  const base = { restType: null, beforeRightSide: false, waitsForStartTap: false, countsInPlan: true } as const;
  const firstSide = sideOf(input.exerciseSide, 'first', 0);

  if (preparation > 0) {
    push({
      ...base,
      kind: 'prepare',
      set: 1,
      rep: 1,
      side: firstSide,
      sidePhase: 'first',
      durationSec: preparation,
      advance: 'timer',
      waitsForStartTap: true,
    });
  } else {
    push({
      ...base,
      kind: 'start',
      set: 1,
      rep: 1,
      side: firstSide,
      sidePhase: 'first',
      durationSec: 0,
      advance: 'tap',
    });
  }

  for (let set = 1; set <= sets; set += 1) {
    for (const sidePhase of sidesForSet(input.exerciseSide)) {
      if (sidePhase === 'second') {
        if (preparation > 0) {
          push({
            ...base,
            kind: 'prepare',
            set,
            rep: 1,
            side: 'right',
            sidePhase,
            beforeRightSide: true,
            durationSec: preparation,
            advance: 'timer',
          });
        } else {
          push({
            ...base,
            kind: 'sideSwitch',
            set,
            rep: 1,
            side: 'right',
            sidePhase,
            durationSec: SIDE_SWITCH_AUTO_START_SECONDS,
            advance: 'timer',
            countsInPlan: false,
          });
        }
      }
      for (let rep = 1; rep <= reps; rep += 1) {
        push({
          ...base,
          kind: 'work',
          set,
          rep,
          side: sideOf(input.exerciseSide, sidePhase, alternatingCompleted),
          sidePhase,
          durationSec: repSeconds,
          advance: isTimed ? 'timer' : 'tap',
        });
        alternatingCompleted += 1;
        if (rep < reps && restReps > 0) {
          push({
            ...base,
            kind: 'rest',
            set,
            rep: rep + 1,
            side: sideOf(input.exerciseSide, sidePhase, alternatingCompleted),
            sidePhase,
            restType: 'betweenReps',
            durationSec: restReps,
            advance: 'timer',
          });
        }
      }
    }
    if (set < sets && restSets > 0) {
      push({
        ...base,
        kind: 'rest',
        set: set + 1,
        rep: 1,
        side: sideOf(input.exerciseSide, 'first', alternatingCompleted),
        sidePhase: 'first',
        restType: 'betweenSets',
        durationSec: restSets,
        advance: 'timer',
      });
    }
  }

  return { steps, plannedDurationSec: planned, timelineDurationSec: clock };
}

/** Krok widoczny w sekundzie `atSec` osi scenariusza; po końcu `null`. */
export function findPlayerScriptStep(script: PlayerScript, atSec: number): PlayerScriptStep | null {
  for (const step of script.steps) {
    if (atSec >= step.startSec && atSec < step.startSec + step.durationSec) return step;
  }
  return null;
}

/**
 * Wskazówka na karcie playera po `elapsedSec` sekundach kroku, tak jak liczą ją widoki faz:
 * przygotowanie i przerwa rotują w czasie swojej fazy, praca na czas w czasie jednego powtórzenia
 * (widok powtórzenia startuje od nowa), praca odhaczana od ostatniego odhaczenia, a przed pierwszym
 * powtórzeniem serii pokazuje podpowiedź startu. Ekrany startu i zmiany strony nie mają karty: `null`.
 */
export function playerScriptHintAt(
  step: PlayerScriptStep,
  guidance: PlayerScriptGuidance,
  elapsedSec: number
): string | null {
  const options = { rotateEverySec: PLAYER_HINT_ROTATE_EVERY_SEC };
  switch (step.kind) {
    case 'start':
    case 'sideSwitch':
      return null;
    case 'prepare':
      return selectPhaseHint('prepare', elapsedSec, {
        ...options,
        hints: step.beforeRightSide ? [RIGHT_SIDE_PREPARATION_HINT, ...guidance.prepare] : guidance.prepare,
        phaseDurationSec: step.durationSec,
      });
    case 'rest':
      return selectPhaseHint('rest', elapsedSec, {
        ...options,
        hints: guidance.rest,
        phaseDurationSec: step.durationSec,
      });
    case 'work':
      if (step.advance === 'timer') {
        return selectPhaseHint('work', elapsedSec, {
          ...options,
          hints: guidance.work,
          phaseDurationSec: step.durationSec,
        });
      }
      return step.rep === 1
        ? REPS_PLAYER_START_HINT
        : selectPhaseHint('work', elapsedSec, { ...options, hints: guidance.work });
  }
}
