import { describe, expect, it } from 'vitest';

import { computeExerciseTimeLabels } from '@/components/shared/exercise/computedExerciseTime';
import { NEW_EXERCISE_SCHEMA_VERSION } from '@/features/exercises/utils/newExerciseV33';
import { isV33ExerciseRecord } from './exerciseRecordVersion';
import { calculateExerciseTotalSeconds, parseTempo } from './exerciseTime';

/**
 * Czas w edycji ćwiczenia ma być tym, co odliczy player pacjenta. Wyrocznia niżej to przepisany wprost
 * `computePlannedDurationSec` z fizjo-app (`utils/exercisePlannedDuration.ts`) plus wybór czasu powtórzenia
 * z `calculateEstimatedExerciseTime` (czas powtórzenia > tempo > 3 s) i mnożnik „naprzemiennie” rekordu 3.3
 * (`exerciseSideDose`). Siatka przechodzi przez każdą stronę ciała, obie wersje rekordu i kombinacje parametrów,
 * więc przełączanie strony w formularzu zawsze trafia w policzony tu przypadek.
 */
type Side = 'none' | 'left' | 'right' | 'both' | 'alternating';

interface Params {
  sets: number;
  reps: number;
  executionTime: number;
  preparationTime: number;
  tempo: string;
  restReps: number;
  restSets: number;
}

function playerSeconds(p: Params, side: Side, perSide: boolean): number {
  const secondsPerRep = p.executionTime > 0 ? p.executionTime : (parseTempo(p.tempo) ?? 3);
  const reps = p.reps * (side === 'alternating' && perSide ? 2 : 1);
  const passes = side === 'both' ? 2 : 1;
  const workOneSideOfOneSet = secondsPerRep * reps + p.restReps * Math.max(0, reps - 1);
  const sideChangePreparation = side === 'both' ? p.preparationTime * p.sets : 0;
  return (
    p.preparationTime +
    sideChangePreparation +
    workOneSideOfOneSet * p.sets * passes +
    p.restSets * Math.max(0, p.sets - 1)
  );
}

const SIDES: Side[] = ['none', 'left', 'right', 'both', 'alternating'];

const PARAMS: Params[] = [
  { sets: 2, reps: 10, executionTime: 4, preparationTime: 5, tempo: '', restReps: 0, restSets: 60 },
  { sets: 3, reps: 12, executionTime: 0, preparationTime: 5, tempo: '', restReps: 0, restSets: 45 },
  { sets: 3, reps: 8, executionTime: 0, preparationTime: 10, tempo: '3-1-2-0', restReps: 0, restSets: 90 },
  { sets: 3, reps: 8, executionTime: 0, preparationTime: 10, tempo: '3010', restReps: 2, restSets: 90 },
  { sets: 4, reps: 6, executionTime: 5, preparationTime: 0, tempo: '', restReps: 3, restSets: 30 },
  { sets: 1, reps: 15, executionTime: 2, preparationTime: 5, tempo: '', restReps: 1, restSets: 60 },
  { sets: 2, reps: 5, executionTime: 30, preparationTime: 5, tempo: '', restReps: 10, restSets: 60 },
  { sets: 5, reps: 20, executionTime: 3, preparationTime: 15, tempo: '2-0-2-0', restReps: 0, restSets: 120 },
  // Czas powtórzenia wygrywa z tempem, jak w playerze.
  { sets: 2, reps: 10, executionTime: 6, preparationTime: 5, tempo: '2-0-2-0', restReps: 0, restSets: 30 },
  // Literówka w tempie („30”) nie jest 30 s na powtórzenie: zostaje 3 s domyślne.
  { sets: 2, reps: 10, executionTime: 0, preparationTime: 5, tempo: '30', restReps: 0, restSets: 30 },
  { sets: 1, reps: 1, executionTime: 45, preparationTime: 10, tempo: '', restReps: 0, restSets: 0 },
];

const cases = PARAMS.flatMap((params) =>
  SIDES.flatMap((side) => [true, false].map((perSide) => ({ params, side, perSide })))
);

describe('czas ćwiczenia w edycji = czas playera', () => {
  it.each(cases)('$side, na stronę: $perSide, $params', ({ params, side, perSide }) => {
    const expected = playerSeconds(params, side, perSide);
    const portal = calculateExerciseTotalSeconds({
      ...params,
      side,
      type: params.executionTime > 0 ? 'time' : 'reps',
      alternatingPerSide: perSide,
    });
    expect(portal.seconds).toBe(expected);
  });

  it('przełączanie strony w formularzu przelicza czas od razu (te same parametry, inna strona)', () => {
    const params = PARAMS[0];
    const totals = SIDES.map(
      (side) => computeExerciseTimeLabels({ ...params, side }, { type: 'time', alternatingPerSide: true }).total
    );
    // Razem / lewa / prawa: 5 + 2 × 40 + 60; każda strona: + prawa strona i jej przygotowanie; naprzemiennie 3.3: 2 × 20 ruchów.
    expect(totals).toEqual(['2 min 25 s', '2 min 25 s', '2 min 25 s', '3 min 55 s', '3 min 45 s']);
  });

  it('naprzemiennie w rekordzie bez wersji liczy łącznie (połowa ruchów rekordu 3.3)', () => {
    const params = PARAMS[0];
    const legacy = computeExerciseTimeLabels({ ...params, side: 'alternating' }, { type: 'time' });
    const v33 = computeExerciseTimeLabels({ ...params, side: 'alternating' }, { type: 'time', alternatingPerSide: true });
    expect(legacy.total).toBe('2 min 25 s');
    expect(v33.total).toBe('3 min 45 s');
  });
});

describe('kreator nowego ćwiczenia', () => {
  it('nowe ćwiczenie powstaje jako 3.3, więc kreator liczy „naprzemiennie” na stronę jak edycja po zapisie', () => {
    // CreateExerciseWizard bierze flagę z tego samego wyrażenia (zapadka: alternatingPerSideCallSites.test.ts).
    expect(isV33ExerciseRecord({ schemaVersion: NEW_EXERCISE_SCHEMA_VERSION })).toBe(true);
  });
});
