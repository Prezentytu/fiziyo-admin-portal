import { describe, expect, it } from 'vitest';

import {
  acknowledgeFinding,
  buildPatientParameterLine,
  createParameterReview,
  markParameterEdited,
  reviewValues,
  describeFieldNote,
  toCoreUpdates,
  computeSessionSeconds,
  deriveExecutionMode,
  evaluateParameters,
  findHardcodedNumbers,
  formatSessionDuration,
  fromSliderValue,
  replaceHardcodedNumbers,
  sideFactor,
  sliderPercent,
  toSliderValue,
  toParameterValues,
  type ParameterValues,
} from '../parameterRules';
import { formatExerciseDuration } from '@/utils/exerciseTime';

const typicalReps: ParameterValues = { sets: 3, reps: 12, repTime: 3, hold: null, rest: 60 };

describe('evaluateParameters', () => {
  it('nie zapala zielonego dla przysiadu 100 serii × 1000 powtórzeń', () => {
    const result = evaluateParameters({
      values: { sets: 100, reps: 1000, repTime: null, hold: null, rest: 300 },
      mode: 'reps',
      side: 'none',
    });

    expect(result.fields.find((field) => field.key === 'sets')?.level).toBe('limit');
    expect(result.fields.find((field) => field.key === 'reps')?.level).toBe('limit');
    expect(result.sessionLevel).toBe('limit');
    expect(result.blockingCount).toBe(3);
    expect(result.findings[0]).toMatchObject({ key: 'sets', suggested: 3, canAcknowledge: false });
  });

  it('ułamek serii albo powtórzeń zapisany wcześniej blokuje publikację, bo player liczy całe powtórzenia', () => {
    const result = evaluateParameters({ values: { ...typicalReps, reps: 10.5 }, mode: 'reps', side: 'none' });
    const reps = result.fields.find((field) => field.key === 'reps');

    expect(reps?.level).toBe('limit');
    expect(describeFieldNote(reps!)).toBe('Liczba całkowita');
    expect(result.findings[0]).toMatchObject({ key: 'reps', level: 'limit', suggested: 11, canAcknowledge: false });
    expect(result.blockingCount).toBe(1);
  });

  it('typowe parametry nie mają uwag', () => {
    const result = evaluateParameters({ values: typicalReps, mode: 'reps', side: 'none' });

    expect(result.findings).toEqual([]);
    expect(result.fields.map((field) => field.level)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('wartość nietypowa wymaga poprawy albo „OK”', () => {
    const values = { ...typicalReps, sets: 8 };

    const open = evaluateParameters({ values, mode: 'reps', side: 'none' });
    expect(open.findings).toHaveLength(1);
    expect(open.findings[0]).toMatchObject({ level: 'warning', canAcknowledge: true });
    expect(open.blockingCount).toBe(0);

    const acknowledged = evaluateParameters({ values, mode: 'reps', side: 'none', acknowledged: new Set(['sets']) });
    expect(acknowledged.findings).toEqual([]);
    expect(acknowledged.fields[0].level).toBe('acknowledged');
  });

  it('pusty czas powtórzenia przyjmuje domyślne 3 s bez uwagi', () => {
    const result = evaluateParameters({ values: { ...typicalReps, repTime: null }, mode: 'reps', side: 'none' });

    expect(result.findings).toEqual([]);
    expect(result.fields.find((field) => field.key === 'repTime')?.level).toBe('default');
  });

  it('brak serii blokuje, a brak przerwy przy jednej serii nie', () => {
    const missingSets = evaluateParameters({ values: { ...typicalReps, sets: null }, mode: 'reps', side: 'none' });
    expect(missingSets.findings[0]).toMatchObject({ key: 'sets', level: 'limit' });

    const singleSet = evaluateParameters({
      values: { sets: 1, reps: null, repTime: null, hold: 30, rest: null },
      mode: 'hold',
      side: 'none',
    });
    expect(singleSet.findings.map((finding) => finding.key)).toEqual(['sets']);
  });

  it('pusta przerwa jest błędem tylko wtedy, gdy jest wymagana', () => {
    const restLevel = (sets: number) =>
      evaluateParameters({ values: { ...typicalReps, sets, rest: null }, mode: 'reps', side: 'none' }).fields.find(
        (field) => field.key === 'rest'
      )?.level;

    expect(restLevel(1)).toBe('default');
    expect(restLevel(3)).toBe('empty');
  });

  it('ostrzega o długim ćwiczeniu, choć każde pole mieści się w limicie', () => {
    const result = evaluateParameters({
      values: { sets: 5, reps: 20, repTime: 6, hold: null, rest: 120 },
      mode: 'reps',
      side: 'both',
    });

    expect(result.sessionSeconds).toBe(5 * 20 * 6 * 2 + 4 * 120);
    expect(result.sessionLevel).toBe('warning');
    expect(result.findings.at(-1)).toMatchObject({ key: 'session', canAcknowledge: true });
    expect(result.blockingCount).toBe(0);

    const acknowledged = evaluateParameters({
      values: { sets: 5, reps: 20, repTime: 6, hold: null, rest: 120 },
      mode: 'reps',
      side: 'both',
      acknowledgedSessionSeconds: result.sessionSeconds,
    });
    expect(acknowledged.findings).toEqual([]);

    const changedAfterAck = evaluateParameters({
      values: { sets: 5, reps: 20, repTime: 6, hold: null, rest: 120 },
      mode: 'reps',
      side: 'both',
      acknowledgedSessionSeconds: result.sessionSeconds,
      timing: { restReps: 2 },
    });
    expect(changedAfterAck.findings.at(-1)).toMatchObject({ key: 'session', canAcknowledge: true });
  });

  it('ćwiczenia ponad godzinę nie da się potwierdzić „OK”', () => {
    const result = evaluateParameters({
      values: { sets: 20, reps: 20, repTime: 10, hold: null, rest: 120 },
      mode: 'reps',
      side: 'none',
      acknowledgedSessionSeconds: 20 * 20 * 10 + 19 * 120,
    });

    expect(result.sessionLevel).toBe('limit');
    expect(result.findings.at(-1)).toMatchObject({ key: 'session', level: 'limit', canAcknowledge: false });
  });
});

describe('computeSessionSeconds', () => {
  it('dolicza mikroprzerwy między powtórzeniami i czas przygotowania jak katalog', () => {
    const values = { sets: 5, reps: 20, repTime: 7, hold: null, rest: 120 };
    const seconds = computeSessionSeconds(values, 'reps', 'both', { restReps: 10, preparationTime: 5 });
    // Przygotowanie na starcie i przed prawą stroną każdej z 5 serii (jak player mobile).
    expect(seconds).toBe(5 + 5 * 5 + 5 * (20 * 7 + 19 * 10) * 2 + 4 * 120);

    const result = evaluateParameters({
      values,
      mode: 'reps',
      side: 'both',
      timing: { restReps: 10, preparationTime: 5 },
    });
    expect(result.sessionLevel).toBe('limit');
  });

  it('przy pustym czasie powtórzenia liczy tempo; tryb powtórzeń (zapis REPS) nie liczy legacy duration, jak player', () => {
    const values = { sets: 5, reps: 20, repTime: null, hold: null, rest: 60 };
    expect(computeSessionSeconds(values, 'reps', 'both', { tempo: '10-0-10-0' })).toBe(5 * 20 * 20 * 2 + 4 * 60);
    expect(
      computeSessionSeconds({ sets: 6, reps: 10, repTime: null, hold: null, rest: 60 }, 'reps', 'none', {
        duration: 180,
      })
    ).toBe(6 * 10 * 3 + 5 * 60);
  });

  it('tempo 20 s na powtórzenie blokuje ćwiczenie ponad godzinę', () => {
    const result = evaluateParameters({
      values: { sets: 5, reps: 20, repTime: null, hold: null, rest: 60 },
      mode: 'reps',
      side: 'both',
      timing: { tempo: '10-0-10-0' },
    });
    expect(result.sessionLevel).toBe('limit');
    expect(result.blockingCount).toBeGreaterThan(0);
  });

  it('liczy każdą stronę osobno podwójnie', () => {
    expect(computeSessionSeconds(typicalReps, 'reps', 'none')).toBe(3 * 36 + 2 * 60);
    expect(computeSessionSeconds(typicalReps, 'reps', 'both')).toBe(3 * 72 + 2 * 60);
  });

  it('w utrzymaniu pozycji liczy czas utrzymania', () => {
    expect(computeSessionSeconds({ sets: 3, reps: null, repTime: null, hold: 30, rest: 60 }, 'hold', 'none')).toBe(210);
  });
});

describe('deriveExecutionMode / toParameterValues', () => {
  it('rozpoznaje utrzymanie pozycji po jednym powtórzeniu z długim czasem', () => {
    expect(deriveExecutionMode({ reps: 1, executionTime: 30 })).toBe('hold');
    expect(deriveExecutionMode({ reps: null, executionTime: null, duration: 45 })).toBe('hold');
    expect(deriveExecutionMode({ reps: 12, executionTime: 3 })).toBe('reps');
  });

  it('puste powtórzenia z czasem powtórzenia to tryb powtórzeń, jak w katalogu', () => {
    expect(deriveExecutionMode({ reps: null, executionTime: 45 })).toBe('reps');

    const result = evaluateParameters({
      values: toParameterValues({ sets: 5, reps: null, executionTime: 45, restSets: 120, side: 'both' }, 'reps'),
      mode: 'reps',
      side: 'both',
    });
    expect(result.findings[0]).toMatchObject({ key: 'reps', level: 'limit' });
  });

  it('mapuje czas utrzymania z executionTime', () => {
    const values = toParameterValues({ sets: 3, reps: 1, executionTime: 30, restSets: 60, side: 'none' }, 'hold');
    expect(values).toEqual({ sets: 3, reps: 1, repTime: null, hold: 30, rest: 60 });
  });

  it('pokazuje powtórzenia także przy utrzymaniu pozycji i nie traktuje 1 jako „mało”', () => {
    const values = reviewValues({ sets: 3, reps: 1, executionTime: 30, restSets: 60, side: 'none' });
    const result = evaluateParameters({ values, mode: 'hold', side: 'none' });

    expect(result.fields.map((field) => field.key)).toEqual(['sets', 'reps', 'hold', 'rest']);
    expect(result.fields.find((field) => field.key === 'reps')?.level).toBe('ok');
    expect(result.findings).toEqual([]);
  });

  it('tryb wynika z wartości: 1 powtórzenie trzymane 10 s i dłużej to utrzymanie', () => {
    expect(reviewValues({ sets: 3, reps: 1, executionTime: 30, restSets: 60, side: 'none' }).hold).toBe(30);
    expect(reviewValues({ sets: 3, reps: 1, executionTime: 3, restSets: 60, side: 'none' }).repTime).toBe(3);
  });

  it('strona „Na każdą stronę” podwaja czas', () => {
    expect(sideFactor('both')).toBe(2);
    expect(sideFactor('alternating')).toBe(1);
  });
});

describe('buildPatientParameterLine', () => {
  it('opisuje parametry jak pacjent je zobaczy', () => {
    expect(buildPatientParameterLine(typicalReps, 'reps', 'both')).toBe(
      '3 serie × 12 powtórzeń na każdą stronę · przerwa 60 s'
    );
  });

  it('przy dawce na stronę (v3.3) mówi „na każdą stronę” także dla „naprzemiennie”', () => {
    expect(buildPatientParameterLine(typicalReps, 'reps', 'alternating')).toBe('3 serie × 12 powtórzeń · przerwa 60 s');
    expect(buildPatientParameterLine(typicalReps, 'reps', 'alternating', true)).toBe(
      '3 serie × 12 powtórzeń na każdą stronę · przerwa 60 s'
    );
  });

  it('czas ćwiczenia „naprzemiennie” liczy powtórzenia raz, także gdy rekord podaje je na stronę', () => {
    // Known gap (SPEC-037): with `side.per_side_dose` the patient does twice as many repetitions.
    expect(computeSessionSeconds(typicalReps, 'reps', 'alternating')).toBe(
      computeSessionSeconds(typicalReps, 'reps', 'none')
    );
  });
});

describe('hardcoded numbers in patient description', () => {
  it('wykrywa i zamienia liczby, które rozjadą się z parametrami', () => {
    const text = 'Wykonaj 10 powtórzeń, potem 3 serie. Wytrzymaj 30 sekund.';

    expect(findHardcodedNumbers(text)).toEqual(['10 powtórzeń', '3 serie', '30 sekund']);
    expect(replaceHardcodedNumbers(text)).toBe(
      'Wykonaj zadaną liczbę powtórzeń, potem zadaną liczbę serii. Wytrzymaj zadany czas.'
    );
  });

  it('nie rusza liczb niezwiązanych z parametrami', () => {
    expect(findHardcodedNumbers('Ugnij kolano do 90 stopni.')).toEqual([]);
  });
});

describe('toCoreUpdates', () => {
  it('maps tile fields to exercise fields', () => {
    const current = { reps: 12, executionTime: 3 };
    expect(toCoreUpdates('sets', 4, current)).toEqual({ sets: 4 });
    expect(toCoreUpdates('repTime', 5, current)).toEqual({ executionTime: 5 });
    expect(toCoreUpdates('rest', 90, current)).toEqual({ restSets: 90 });
  });

  it('stores a hold as one long repetition', () => {
    expect(toCoreUpdates('hold', 30, { reps: 12, executionTime: 3 })).toEqual({ executionTime: 30, reps: 1 });
    expect(toCoreUpdates('hold', 45, { reps: 1, executionTime: 30 })).toEqual({ executionTime: 45 });
  });
});

describe('parameter review state', () => {
  it('reopens an acknowledged field after it is edited', () => {
    const review = acknowledgeFinding(createParameterReview(), 'reps', 0);
    expect(review.acknowledged.has('reps')).toBe(true);
    expect(markParameterEdited(review, 'reps').acknowledged.has('reps')).toBe(false);
  });

  it('keeps the same object when an edit changes nothing in the review', () => {
    const review = createParameterReview();
    expect(markParameterEdited(review, 'sets')).toBe(review);
  });

  it('remembers the confirmed session length', () => {
    expect(acknowledgeFinding(createParameterReview(), 'session', 1200).acknowledgedSessionSeconds).toBe(1200);
  });
});

describe('suwak parametru', () => {
  it('typowy zakres zajmuje czytelną część suwaka, a nie kilka procent skali limitu', () => {
    const bandWidth = sliderPercent('reps', 20) - sliderPercent('reps', 6);
    expect(bandWidth).toBeGreaterThan(25);
  });

  it('wartość ponad skalą suwaka stoi na jego końcu', () => {
    expect(sliderPercent('reps', 1000)).toBe(100);
    expect(sliderPercent('sets', 0)).toBe(0);
  });

  it('puste pole ustawia suwak na wartości, którą pacjent i tak dostanie', () => {
    expect(toSliderValue('repTime', null)).toBe(3);
    expect(toSliderValue('sets', null)).toBe(3);
    expect(toSliderValue('reps', 500)).toBe(40);
  });

  it('przesunięcie suwaka daje wartość z krokiem pola', () => {
    expect(fromSliderValue('rest', '75')).toBe(75);
    expect(fromSliderValue('rest', '83')).toBe(90);
    expect(fromSliderValue('sets', '4')).toBe(4);
  });
});

describe('describeFieldNote', () => {
  it('mówi krótko, czego dotyczy sugestia albo błąd', () => {
    expect(describeFieldNote({ key: 'sets', value: 1, level: 'warning' })).toBe('Mało, zwykle 2–5');
    expect(describeFieldNote({ key: 'rest', value: 180, level: 'warning' })).toBe('Dużo, zwykle 30–120 s');
    expect(describeFieldNote({ key: 'sets', value: 100, level: 'limit' })).toBe('Maks. 20');
    expect(describeFieldNote({ key: 'sets', value: null, level: 'empty' })).toBe('Puste');
    expect(describeFieldNote({ key: 'sets', value: 3, level: 'ok' })).toBe('');
  });
});

describe('formatSessionDuration', () => {
  it('pisze czas tak samo jak karta ćwiczenia', () => {
    expect(formatSessionDuration(398, false)).toBe(formatExerciseDuration(398, false));
    expect(formatSessionDuration(398, false)).toBe('6 min 38 s');
    expect(formatSessionDuration(398, true)).toBe(formatExerciseDuration(398, true));
  });

  it('oznacza szacunek, gdy nie znamy czasu powtórzenia', () => {
    const evaluation = evaluateParameters({
      values: { sets: 3, reps: 10, repTime: null, hold: null, rest: 60 },
      mode: 'reps',
      side: 'none',
    });
    expect(evaluation.sessionIsEstimate).toBe(true);
  });
});
