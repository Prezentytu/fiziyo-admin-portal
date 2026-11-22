import { describe, expect, it } from 'vitest';

import { evaluateParameters } from '../parameterRules';
import {
  exerciseRangesOf,
  prescriptionWithBound,
  prescriptionWithDefaultWord,
  prescriptionWithGoal,
  prescriptionWithStep,
  readStep,
  sideForColumn,
} from '../v33Prescription';

const prescription = {
  goal: 'mobility',
  mode: 'reps',
  params: {
    sets: { default: 1, min: 1, max: 2 },
    reps: { default: 3, min: 2, max: 5 },
    rep_s: { default: 29, min: 24, max: 49, source: 'pomiar z filmu' },
    rest_sets_s: { default: 30, min: 15, max: 60 },
    rom: { default: 'pain_free' },
  },
  progression: { criterion: 'Bez bólu', next: ['w klęku'] },
};

describe('strona: kolumna i side.mode zmieniają się razem', () => {
  it('na każdą stronę to each_side z dawką na stronę, strona w mediach zostaje', () => {
    expect(
      sideForColumn({ mode: 'none', per_side_dose: false, shown_in_media: 'left' }, 'both')
    ).toEqual({ mode: 'each_side', per_side_dose: true, shown_in_media: 'left' });
  });

  it('naprzemiennie liczy na stronę, tylko prawa nie liczy na stronę', () => {
    expect(sideForColumn(null, 'alternating')).toEqual({ mode: 'alternating', per_side_dose: true });
    expect(sideForColumn({ mode: 'each_side', per_side_dose: true }, 'right')).toEqual({
      mode: 'right',
      per_side_dose: false,
    });
  });
});

describe('zakresy, cel i kroki', () => {
  it('granica zakresu zmienia tylko siebie, default i source zostają', () => {
    const next = prescriptionWithBound(prescription, 'rep_s', 'max', 60);
    expect(next.params).toMatchObject({ rep_s: { default: 29, min: 24, max: 60, source: 'pomiar z filmu' } });
    expect(next.goal).toBe('mobility');
    expect(prescription.params.rep_s.max).toBe(49);
  });

  it('pusty zakres znika z params', () => {
    const noMin = prescriptionWithBound({ params: { prep_s: { min: 5 } } }, 'prep_s', 'min', null);
    expect(noMin.params).toEqual({});
  });

  it('cel i zakres ruchu słownie', () => {
    expect(prescriptionWithGoal(prescription, 'strength').goal).toBe('strength');
    expect('goal' in prescriptionWithGoal(prescription, null)).toBe(false);
    expect(prescriptionWithDefaultWord(prescription, 'rom', 'full').params).toMatchObject({ rom: { default: 'full' } });
  });

  it('progresja: kryterium i kroki, pusty krok znika', () => {
    const next = prescriptionWithStep(prescription, 'regression', { criterion: 'Ból ponad 5/10', next: [] });
    expect(readStep(next, 'regression')).toEqual({ criterion: 'Ból ponad 5/10', next: [] });
    expect('regression' in prescriptionWithStep(next, 'regression', { criterion: ' ', next: [] })).toBe(false);
    expect(readStep(next, 'progression')).toEqual({ criterion: 'Bez bólu', next: ['w klęku'] });
  });
});

describe('sugestie według zakresów ćwiczenia', () => {
  it('wartości z zakresu ćwiczenia nie są sugestią, choć ogólnie byłyby', () => {
    const values = { sets: 1, reps: 3, repTime: 29, hold: null, rest: 30 };
    expect(evaluateParameters({ values, mode: 'reps', side: 'both', isV33: true }).findings).toHaveLength(3);

    const evaluation = evaluateParameters({
      values,
      mode: 'reps',
      side: 'both',
      isV33: true,
      exerciseRanges: exerciseRangesOf(prescription),
    });
    expect(evaluation.findings).toEqual([]);
  });

  it('poza zakresem ćwiczenia mówi o zakresie ćwiczenia i proponuje jego wartość domyślną', () => {
    const evaluation = evaluateParameters({
      values: { sets: 1, reps: 8, repTime: 29, hold: null, rest: 30 },
      mode: 'reps',
      side: 'none',
      exerciseRanges: exerciseRangesOf(prescription),
    });
    expect(evaluation.findings).toEqual([
      {
        key: 'reps',
        level: 'warning',
        text: 'Powtórzenia w serii: 8, zakres ćwiczenia 2–5.',
        suggested: 3,
        canAcknowledge: true,
      },
    ]);
  });

  it('niepełny zakres w dokumencie zostawia ogólną regułę', () => {
    expect(exerciseRangesOf({ params: { sets: { default: 2 }, reps: { min: 4 } } })).toEqual({});
  });
});
