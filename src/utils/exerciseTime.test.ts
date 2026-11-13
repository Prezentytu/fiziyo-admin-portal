import { describe, expect, it } from 'vitest';
import {
  calculateEstimatedTime,
  calculateExerciseTotalSeconds,
  formatEstimatedTime,
  formatExerciseDuration,
  parseTempo,
} from './exerciseTime';

describe('parseTempo', () => {
  it('zwraca sume segmentow dla poprawnego tempa', () => {
    expect(parseTempo('3-1-2-0')).toBe(6);
  });

  it('zwraca null dla niepoprawnego tempa', () => {
    expect(parseTempo('3-x-2-0')).toBeNull();
  });

  it('parsuje skompresowany format 4 cyfr bez separatora (zgodnie z wizardem i AI)', () => {
    expect(parseTempo('3010')).toBe(4);
    expect(parseTempo('2010')).toBe(3);
  });

  it('parsuje skompresowany format 3 cyfr bez separatora', () => {
    expect(parseTempo('310')).toBe(4);
  });

  it('nie traktuje ciagu cyfr innej dlugosci niz 1, 3 albo 4 jako sekund na powtorzenie', () => {
    expect(parseTempo('30')).toBeNull();
    expect(parseTempo('20103')).toBeNull();
    expect(parseTempo('3')).toBe(3);
  });

  it('zwraca null gdy wszystkie cyfry sa zerowe', () => {
    expect(parseTempo('0000')).toBeNull();
    expect(parseTempo('0-0-0-0')).toBeNull();
  });
});

describe('calculateExerciseTotalSeconds', () => {
  it('liczy czas na podstawie executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      executionTime: 8,
    });

    expect(result).toEqual({
      seconds: 240,
      isEstimate: false,
    });
  });

  it('liczy czas na podstawie tempa gdy brak executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 2,
      reps: 6,
      tempo: '2-1-2-0',
    });

    expect(result).toEqual({
      seconds: 60,
      isEstimate: false,
    });
  });

  it('uzywa fallback 3s na powtorzenie gdy brak executionTime i tempa', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 2,
      reps: 10,
    });

    expect(result).toEqual({
      seconds: 60,
      isEstimate: true,
    });
  });

  it('podwaja prace w serii dla side=both bez wstawiania restReps miedzy stronami', () => {
    expect(
      calculateExerciseTotalSeconds({
        sets: 1,
        reps: 10,
        executionTime: 5,
        side: 'both',
      }),
    ).toEqual({
      seconds: 100,
      isEstimate: false,
    });

    expect(
      calculateExerciseTotalSeconds({
        sets: 1,
        reps: 8,
        executionTime: 5,
        preparationTime: 25,
        side: 'BOTH',
      }),
    // Jak player mobile: przygotowanie także przed prawą stroną (25 + 25 + 80).
    ).toEqual({ seconds: 130, isEstimate: false });

    expect(
      calculateExerciseTotalSeconds({
        sets: 2,
        reps: 1,
        executionTime: 20,
        restSets: 15,
        preparationTime: 15,
        side: 'both',
      }),
    ).toEqual({ seconds: 140, isEstimate: false });

    expect(
      calculateExerciseTotalSeconds({
        sets: 2,
        reps: 8,
        executionTime: 5,
        restReps: 2,
        restSets: 30,
        side: 'both',
      }),
    ).toEqual({ seconds: 246, isEstimate: false });

    // Player: work * 2 + restSets once. Doubling restSets would be 540.
    expect(
      calculateExerciseTotalSeconds({
        sets: 3,
        reps: 10,
        executionTime: 5,
        restSets: 60,
        side: 'both',
      }),
    ).toEqual({ seconds: 420, isEstimate: false });
  });

  it('calculateEstimatedTime przekazuje tempo i nie mnozy restSets przez BOTH', () => {
    expect(
      calculateEstimatedTime({
        sets: 2,
        reps: 6,
        tempo: '2-1-2-0',
        rest: 10,
        restReps: 1,
        preparationTime: 5,
        side: 'both',
      }),
    // 5 start + 2 × 5 przed prawą stroną + praca + 1 przerwa między seriami.
    ).toBe(165);
  });

  it('liczy „naprzemiennie” w rekordzie 3.3 na stronę: 2 × reps powtórzeń w serii, jak player (wariant B 13.11)', () => {
    const dose = { sets: 2, reps: 10, executionTime: 3, restSets: 20, restReps: 1, preparationTime: 5, type: 'reps' };
    // 5 + 2 × (20 × 3 + 19 × 1) + 20 = 183, ta sama liczba co `calculateEstimatedExerciseTime` w fizjo-app.
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'alternating', alternatingPerSide: true }).seconds).toBe(183);
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'ALTERNATING', alternatingPerSide: true }).seconds).toBe(183);
    // Bez przygotowania przed drugą stroną, w odróżnieniu od „na każdą stronę”.
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'both' }).seconds).toBe(191);
    // Szkic z czasem serii: czas serii też na stronę.
    expect(
      calculateExerciseTotalSeconds({ sets: 1, duration: 30, side: 'alternating', alternatingPerSide: true }).seconds
    ).toBe(60);
  });

  it('liczy „naprzemiennie” w rekordzie bez wersji łącznie, jak przed zmianą kontraktu', () => {
    const dose = { sets: 2, reps: 10, executionTime: 3, restSets: 20, restReps: 1, preparationTime: 5, type: 'reps' };
    // 5 + 2 × (10 × 3 + 9 × 1) + 20 = 103; to samo co strona „razem”.
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'alternating' }).seconds).toBe(103);
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'alternating', alternatingPerSide: false }).seconds).toBe(103);
    expect(calculateExerciseTotalSeconds({ ...dose, side: 'none' }).seconds).toBe(103);
  });

  it('daje priorytet executionTime nad duration', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      executionTime: 10,
      duration: 40,
    });

    expect(result).toEqual({
      seconds: 300,
      isEstimate: false,
    });
  });

  it('uzywa duration jako fallback gdy brak executionTime', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 10,
      duration: 40,
    });

    expect(result).toEqual({
      seconds: 120,
      isEstimate: false,
    });
  });

  it('liczy czas dla skompresowanego tempa "2010" bez wybuchu do 1208 min (regresja)', () => {
    // Regresja: wczesniej parseTempo("2010") zwracalo 2010 sekund/powt, co dawalo
    // ~72485 s = 1208 min 5 s w naglowku wizarda. Po fixie tempo "2010" = 2+0+1+0 = 3 s.
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 12,
      restSets: 60,
      preparationTime: 5,
      tempo: '2010',
    });

    // 3 * (12 * 3) + 2 * 60 + 5 = 108 + 120 + 5 = 233
    expect(result).toEqual({
      seconds: 233,
      isEstimate: false,
    });
  });

  it('dodaje preparationTime jednorazowo oraz restSets i restReps', () => {
    const result = calculateExerciseTotalSeconds({
      sets: 3,
      reps: 4,
      executionTime: 5,
      restReps: 2,
      restSets: 30,
      preparationTime: 10,
    });

    // 3 * (4*5 + 3*2) + 2*30 + 10 = 148
    expect(result).toEqual({
      seconds: 148,
      isEstimate: false,
    });
  });
});

describe('formatExerciseDuration', () => {
  it('formatuje dokladny czas bez estymacji', () => {
    expect(formatExerciseDuration(150, false)).toBe('2 min 30 s');
  });

  it('formatuje czas estymowany z prefiksem', () => {
    expect(formatExerciseDuration(150, true)).toBe('~3 min');
  });

  it('pokazuje godziny od 60 minut', () => {
    expect(formatExerciseDuration(3900, false)).toBe('1 h 5 min');
    expect(formatExerciseDuration(3600, true)).toBe('~1 h');
  });

  it('nie pokazuje NaN dla niepoprawnej liczby', () => {
    expect(formatExerciseDuration(Number.NaN, false)).toBe('0 s');
  });
});

describe('formatEstimatedTime', () => {
  it('zaokragla do minut z prefiksem', () => {
    expect(formatEstimatedTime(150)).toBe('~3 min');
    expect(formatEstimatedTime(20)).toBe('~1 min');
  });

  it('pokazuje godziny od 60 minut', () => {
    expect(formatEstimatedTime(3900)).toBe('~1 h 5 min');
    expect(formatEstimatedTime(7200)).toBe('~2 h');
  });

  it('nie pokazuje NaN ani Infinity', () => {
    expect(formatEstimatedTime(Number.NaN)).toBe('~0 min');
    expect(formatEstimatedTime(Number.POSITIVE_INFINITY)).toBe('~0 min');
  });
});
