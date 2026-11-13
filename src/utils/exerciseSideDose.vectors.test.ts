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
type Mode = 'none' | 'alternating' | 'each_side' | 'alternating_time';
type Vector = [
  mode: Mode,
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

// Dokładnie wiersze 1-10 pliku wektorów (kolumny jak wyżej), w tej samej kolejności.
const VECTORS: Vector[] = [
  ['none', 'bez wersji', 10, 3, 3, 2, 30, 5, 10, 48, 209],
  ['alternating', 'bez wersji', 10, 3, 3, 2, 30, 5, 10, 48, 209],
  ['alternating', '3.3', 10, 3, 3, 2, 30, 5, 20, 98, 359],
  ['each_side', 'bez wersji', 10, 3, 3, 2, 30, 5, 20, 101, 368],
  ['each_side', '3.3', 10, 3, 3, 2, 30, 5, 20, 101, 368],
  ['alternating', 'bez wersji', 7, 2, 4, 1, 20, 0, 7, 34, 88],
  ['alternating', '3.3', 7, 2, 4, 1, 20, 0, 14, 69, 158],
  ['alternating', '3.3', 1, 1, 3, 2, 0, 5, 2, 8, 13],
  ['alternating_time', 'bez wersji', 3, 2, 30, 5, 40, 5, 3, 100, 245],
  ['alternating_time', '3.3', 3, 2, 30, 5, 40, 5, 6, 205, 455],
];

const sideOf = (mode: Mode) => (mode === 'each_side' ? 'both' : mode === 'none' ? 'none' : 'alternating');
const typeOf = (mode: Mode) => (mode === 'alternating_time' ? 'time' : 'reps');
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
      type: typeOf(mode),
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

/**
 * Ta sama tabela co w aplikacji (`selectExerciseReader`, utils/__tests__/exerciseSchema.test.ts) i w backendzie
 * (`ExerciseSchemaVersion.ReadDeclared`): czytnik v3_3 tylko dla tekstu z poprawną wersją >= 3.3, przyciętego jak
 * `string.Trim()`, najwyżej 16 znaków. Wejścia identyczne z `naprzemiennie-wersje.md` (scratchpad zlecenia).
 * Wynik `true` = aplikacja wybiera czytnik v3_3 (także dla 3.4 i 4.0, z `supported: false`).
 */
// Czwarta wartość: wynik dla kolumny `schemaVersion`, gdy różni się od dokumentu. Kolumnę portal czyta jak
// aplikacja pacjenta (przycięcie JS, bez limitu długości), dokument jak backend (`string.Trim()`, 16 znaków).
const VERSION_CASES: [label: string, declared: unknown, isNew: boolean, isNewInColumn?: boolean][] = [
  ["3.3", "3.3", true],
  ["3.3.0", "3.3.0", true],
  ["3.3.0.0", "3.3.0.0", true],
  ["3.10", "3.10", true],
  ["3.4", "3.4", true],
  ["4.0", "4.0", true],
  ["03.3", "03.3", true],
  ["3.03", "3.03", true],
  ["00003.3", "00003.3", true],
  ["3.3.0.00000", "3.3.0.00000", true],
  ["3.3 z brzegami (spacje)", " 3.3 ", true],
  ["3.3 ze spacją z lewej", " 3.3", true],
  ["3.3 ze spacją z prawej", "3.3 ", true],
  ["3.3 z tabem", "\t3.3", true],
  ["3.3 z nową linią", "3.3\n", true],
  ["3.3 z NBSP", "\u00a03.3\u00a0", true],
  ["3.3 z em-space", "\u20033.3\u2003", true],
  ["3.3 z U+0085", "\u00853.3\u0085", true, false],
  ["3.3 z U+FEFF", "\ufeff3.3", false, true],
  ["3.3 ze znakiem w środku", "3. 3", false],
  ["3.2", "3.2", false],
  ["3.2.9", "3.2.9", false],
  ["3", "3", false],
  ["2.0", "2.0", false],
  ["v3.3", "v3.3", false],
  ["3.3-beta", "3.3-beta", false],
  ["3.3x", "3.3x", false],
  ["3.3.0.0.0", "3.3.0.0.0", false],
  ["3.3.", "3.3.", false],
  [".3.3", ".3.3", false],
  ["123456.0", "123456.0", false],
  ["16 znaków", "00003.00003.0000", true],
  ["00003.00003.00000", "00003.00003.00000", false, true],
  ["cyfry arabsko-indyjskie", "\u0663.\u0663", false],
  ["3,3", "3,3", false],
  ["pusty", "", false],
  ["same spacje", "   ", false],
  ["liczba 3.3", 3.3, false],
  ["liczba 4", 4, false],
  ["true", true, false],
  ["obiekt", {}, false],
  ["null", null, false],
];

describe('isV33ExerciseRecord: jedna reguła „czy rekord jest 3.3”, tabela jak w aplikacji i backendzie', () => {
  describe.each(VERSION_CASES)('wersja %s', (_label, declared, isNew, isNewInColumn = isNew) => {
    it('w dokumencie enrichmentData (obiekt)', () => {
      expect(isV33ExerciseRecord({ enrichmentData: { schemaVersion: declared } })).toBe(isNew);
    });
    it('w dokumencie enrichmentData (tekst JSON)', () => {
      expect(isV33ExerciseRecord({ enrichmentData: JSON.stringify({ schemaVersion: declared }) })).toBe(isNew);
    });
    it('w kolumnie schemaVersion', () => {
      expect(isV33ExerciseRecord({ schemaVersion: declared })).toBe(isNewInColumn);
    });
  });

  it('brak wersji, brak dokumentu i zepsuty dokument to stary rekord', () => {
    expect(isV33ExerciseRecord({ enrichmentData: {} })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: 'nie json' })).toBe(false);
    expect(isV33ExerciseRecord({ enrichmentData: null })).toBe(false);
    expect(isV33ExerciseRecord({})).toBe(false);
    expect(isV33ExerciseRecord(null)).toBe(false);
    expect(isV33ExerciseRecord(undefined)).toBe(false);
  });

  it('kolumna ma pierwszeństwo przed dokumentem, pusta kolumna oddaje głos dokumentowi', () => {
    expect(isV33ExerciseRecord({ schemaVersion: '3.2', enrichmentData: { schemaVersion: '3.3' } })).toBe(false);
    expect(isV33ExerciseRecord({ schemaVersion: '3.3', enrichmentData: { schemaVersion: '3.2' } })).toBe(true);
    expect(isV33ExerciseRecord({ schemaVersion: '', enrichmentData: { schemaVersion: '3.3' } })).toBe(true);
    expect(isV33ExerciseRecord({ schemaVersion: null, enrichmentData: { schemaVersion: '3.3' } })).toBe(true);
    expect(isV33ExerciseRecord({ schemaVersion: 'v3.3', enrichmentData: { schemaVersion: '3.3' } })).toBe(false);
  });
});
