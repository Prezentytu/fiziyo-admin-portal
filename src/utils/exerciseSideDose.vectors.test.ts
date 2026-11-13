import { describe, expect, it } from 'vitest';
import { calculateExerciseTotalSeconds } from './exerciseTime';
import { isV33ExerciseRecord } from './exerciseRecordVersion';

/**
 * Wspólne wektory portal / aplikacja / backend (KONTRAKT-v3.3 §6.7, wariant B z 13.11):
 * „naprzemiennie” liczy na stronę tylko rekord w wersji 3.3, rekord bez wersji liczy łącznie jak dotąd.
 * Rachunek niezależny od kodu: baza-wiedzy `naprzemiennie-wektory.md`. Kolumny: tryb, wersja, reps, serie,
 * rep_s, rest (między powtórzeniami), rest_s (między seriami), prep → ruchów, seria s, całość s.
 */
type Version = '3.3' | 'bez wersji';
type Vector = [
  mode: 'alternating' | 'each_side',
  version: Version,
  reps: number,
  sets: number,
  repSeconds: number,
  rest: number,
  restSets: number,
  prep: number,
  moves: number,
  seriesSeconds: number,
  totalSeconds: number,
];

const VECTORS: Vector[] = [
  ['alternating', '3.3', 10, 3, 3, 2, 30, 5, 20, 98, 359],
  ['alternating', 'bez wersji', 10, 3, 3, 2, 30, 5, 10, 48, 209],
  ['each_side', '3.3', 10, 3, 3, 2, 30, 5, 20, 101, 368],
  ['each_side', 'bez wersji', 10, 3, 3, 2, 30, 5, 20, 101, 368],
  ['alternating', '3.3', 7, 3, 2, 1, 20, 5, 14, 41, 168],
  ['alternating', 'bez wersji', 7, 3, 2, 1, 20, 5, 7, 20, 105],
  ['alternating', '3.3', 1, 3, 30, 2, 20, 0, 2, 62, 226],
  ['alternating', 'bez wersji', 1, 3, 30, 2, 20, 0, 1, 30, 130],
  ['alternating', '3.3', 9, 1, 4, 0, 0, 0, 18, 72, 72],
  ['alternating', 'bez wersji', 9, 1, 4, 0, 0, 0, 9, 36, 36],
  ['each_side', 'bez wersji', 5, 2, 3, 1, 15, 3, 10, 41, 100],
  ['alternating', '3.3', 5, 2, 3, 1, 15, 3, 10, 39, 96],
];

const sideOf = (mode: Vector[0]) => (mode === 'each_side' ? 'both' : 'alternating');
const recordOf = (version: Version) => (version === '3.3' ? { enrichmentData: { schemaVersion: '3.3' } } : { enrichmentData: {} });

describe('wektory „naprzemiennie” (§6.7, wariant B)', () => {
  it.each(VECTORS)('%s, %s, reps %i × %i serii: seria i całość', (mode, version, reps, sets, repSeconds, rest, restSets, prep, _moves, series, total) => {
    const dose = {
      reps,
      executionTime: repSeconds,
      restReps: rest,
      restSets,
      preparationTime: prep,
      side: sideOf(mode),
      type: 'reps',
      alternatingPerSide: isV33ExerciseRecord(recordOf(version)),
    };
    expect(calculateExerciseTotalSeconds({ ...dose, sets: 1, restSets: 0, preparationTime: 0 }).seconds).toBe(
      mode === 'each_side' ? series - prep : series
    );
    expect(calculateExerciseTotalSeconds({ ...dose, sets }).seconds).toBe(total);
  });

  it('stary rekord „naprzemiennie” liczy się jak side „none” (łącznie), niezależnie od flagi braku wersji', () => {
    const dose = { sets: 3, reps: 10, executionTime: 3, restReps: 2, restSets: 30, preparationTime: 5, type: 'reps' };
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'alternating' }).seconds).toBe(209);
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'alternating' }).seconds).toBe(
      calculateExerciseTotalSeconds({ ...dose, side: 'none' }).seconds
    );
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'ALTERNATING', alternatingPerSide: false }).seconds).toBe(209);
  });

  it('flaga „na stronę” działa tylko dla „naprzemiennie”: inne strony liczą jak dotąd', () => {
    const dose = { sets: 3, reps: 10, executionTime: 3, restReps: 2, restSets: 30, preparationTime: 5, type: 'reps' };
    for (const side of ['both', 'none', 'left', 'right']) {
      expect(calculateExerciseTotalSeconds({ ...dose, side, alternatingPerSide: true }).seconds).toBe(
        calculateExerciseTotalSeconds({ ...dose, side }).seconds
      );
    }
  });

  it('szkic z czasem serii: stary rekord ×1, rekord 3.3 ×2', () => {
    const draft = { sets: 1, duration: 30, side: 'alternating' };
    expect(calculateExerciseTotalSeconds(draft).seconds).toBe(30);
    expect(calculateExerciseTotalSeconds({ ...draft, alternatingPerSide: true }).seconds).toBe(60);
  });
});

describe('isV33ExerciseRecord: jedna reguła „czy rekord jest 3.3”', () => {
  it('3.3 i późniejsze są nowe, brak wersji i starsze są stare', () => {
    expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: '3.3' } })).toBe(true);
    expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: '3.10' } })).toBe(true);
    expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: '4.0' } })).toBe(true);
    expect(isV33ExerciseRecord({ enrichmentData: JSON.stringify({ schemaVersion: '3.3' }) })).toBe(true);
    expect(isV33ExerciseRecord({ schemaVersion: 3.3 })).toBe(true);
    expect(isV33ExerciseRecord({ enrichmentData: {} })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: '3.2' } })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: '3' } })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: 'nie json' })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: null })).toBe(false);
    expect(isV33ExerciseRecord(null)).toBe(false);
    expect(isV33ExerciseRecord(undefined)).toBe(false);
  });
});
