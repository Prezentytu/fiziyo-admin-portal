import { describe, expect, it } from 'vitest';

import {
  buildPatientParameterLine,
  computeSessionSeconds,
  deriveExecutionMode,
  evaluateParameters,
  findHardcodedNumbers,
  planModeSwitch,
  replaceHardcodedNumbers,
  sideFactor,
  toParameterValues,
  type ParameterValues,
} from '../parameterRules';

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

  it('typowe parametry nie mają uwag', () => {
    const result = evaluateParameters({ values: typicalReps, mode: 'reps', side: 'none' });

    expect(result.findings).toEqual([]);
    expect(result.openCount).toBe(0);
    expect(result.fields.map((field) => field.level)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('wartość nietypowa wymaga poprawy albo „Tak ma być”', () => {
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

  it('ćwiczenia ponad godzinę nie da się potwierdzić „Tak ma być”', () => {
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
    expect(seconds).toBe(5 + 5 * (20 * 7 + 19 * 10) * 2 + 4 * 120);

    const result = evaluateParameters({
      values,
      mode: 'reps',
      side: 'both',
      timing: { restReps: 10, preparationTime: 5 },
    });
    expect(result.sessionLevel).toBe('limit');
  });

  it('przy pustym czasie powtórzenia liczy tempo i legacy duration jak katalog', () => {
    const values = { sets: 5, reps: 20, repTime: null, hold: null, rest: 60 };
    expect(computeSessionSeconds(values, 'reps', 'both', { tempo: '10-0-10-0' })).toBe(5 * 20 * 20 * 2 + 4 * 60);
    expect(
      computeSessionSeconds({ sets: 6, reps: 10, repTime: null, hold: null, rest: 60 }, 'reps', 'none', {
        duration: 180,
      })
    ).toBe(6 * 180 + 5 * 60);
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

  it('mapuje czas utrzymania z executionTime', () => {
    const values = toParameterValues({ sets: 3, reps: 1, executionTime: 30, restSets: 60, side: 'none' }, 'hold');
    expect(values).toEqual({ sets: 3, reps: null, repTime: null, hold: 30, rest: 60 });
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

describe('planModeSwitch', () => {
  const repsExercise = { reps: 12, executionTime: 3, duration: null };

  it('nie zapisuje 1 powtórzenia, dopóki nie ma czasu utrzymania', () => {
    const plan = planModeSwitch({ current: repsExercise, from: 'reps', to: 'hold', stash: {} });

    expect(plan.values).toBeNull();
    expect(plan.stash.reps).toEqual({ reps: 12, executionTime: 3 });
  });

  it('pomyłkowe przełączenie i powrót przywraca oryginalne parametry', () => {
    const toHold = planModeSwitch({ current: repsExercise, from: 'reps', to: 'hold', stash: {} });
    const back = planModeSwitch({
      current: repsExercise,
      from: 'hold',
      to: 'reps',
      stash: toHold.stash,
      isCurrentPending: true,
    });

    expect(back.values).toEqual({ reps: 12, executionTime: 3 });
    expect(back.stash.hold).toBeUndefined();
  });

  it('bierze czas utrzymania z legacy duration', () => {
    const plan = planModeSwitch({ current: { ...repsExercise, duration: 30 }, from: 'reps', to: 'hold', stash: {} });

    expect(plan.values).toEqual({ reps: 1, executionTime: 30 });
  });

  it('z utrzymania bez zapamiętanych powtórzeń ustawia domyślny czas powtórzenia, nie zero', () => {
    const plan = planModeSwitch({
      current: { reps: 1, executionTime: 30, duration: null },
      from: 'hold',
      to: 'reps',
      stash: {},
    });

    expect(plan.values).toEqual({ reps: null, executionTime: 3 });
    expect(plan.stash.hold).toEqual({ reps: 1, executionTime: 30 });
  });
});
