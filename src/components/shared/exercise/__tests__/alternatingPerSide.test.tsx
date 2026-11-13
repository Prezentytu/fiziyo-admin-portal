import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { toPdfExercise } from '@/components/pdf/pdfExerciseUtils';
import { translateExerciseSidePolish } from '@/components/pdf/polishUtils';
import { formatExerciseDuration } from '@/utils/exerciseTime';
import { getExerciseSideHelp } from '@/utils/exerciseSideLabels';
import { ExerciseExecutionCard } from '../ExerciseExecutionCard';
import { calculateCardTotalSeconds, fromBuilderExercise, fromExerciseMapping } from '../adapters';
import { normalizeExerciseFieldValues } from '../displayNormalizer';
import { formatSideLabel } from '../displayRegistry';
import { estimateEffectiveExerciseSeconds, resolveEffectiveExerciseParams } from '../resolveEffectiveExerciseParams';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

/**
 * Wektor z `naprzemiennie-wektory.md`: 10 powtórzeń, 3 serie, 3 s, przerwa 2 s, między seriami 30 s, przygotowanie 5 s.
 * Rekord 3.3: seria 98 s, całość 359 s. Rekord bez wersji: seria 48 s, całość 209 s (jak main portalu).
 */
const LEGACY = { enrichmentData: {} };
const V33 = { enrichmentData: { schemaVersion: '3.3' } };

const mappingOf = (record: object) => ({
  id: 'mapping-alt',
  exerciseId: 'exercise-alt',
  sets: 3,
  reps: 10,
  executionTime: 3,
  restSets: 30,
  restReps: 2,
  preparationTime: 5,
  exercise: { id: 'exercise-alt', name: 'Wykrok', type: 'REPS', side: 'ALTERNATING', ...record },
});

const builderExerciseOf = (record: object) => ({
  id: 'exercise-alt',
  name: 'Wykrok',
  type: 'REPS',
  side: 'alternating',
  defaultSets: 3,
  defaultReps: 10,
  defaultExecutionTime: 3,
  defaultRestBetweenSets: 30,
  defaultRestBetweenReps: 2,
  preparationTime: 5,
  ...record,
});

const BUILDER_PARAMS = { sets: 3, reps: 10, executionTime: 3, restSets: 30, restReps: 2, preparationTime: 5 };

describe.each([
  ['rekord bez wersji', LEGACY, 209, false],
  ['rekord 3.3', V33, 359, true],
] as const)('„naprzemiennie”: %s', (_name, record, expectedSeconds, perSide) => {
  it('czas ćwiczenia, zestawu i kreatora przypisania to ta sama liczba', () => {
    const mapping = mappingOf(record);
    const effective = resolveEffectiveExerciseParams(mapping);
    expect(effective.alternatingPerSide).toBe(perSide);
    // lista zestawów, podsumowanie i kreator przypisania
    expect(estimateEffectiveExerciseSeconds(effective)).toBe(expectedSeconds);
    // karta ćwiczenia z mappingu
    expect(calculateCardTotalSeconds(fromExerciseMapping(mapping)).seconds).toBe(expectedSeconds);
    // karta ze Set Buildera (ćwiczenie + parametry)
    expect(
      calculateCardTotalSeconds(fromBuilderExercise(builderExerciseOf(record), { ...BUILDER_PARAMS, exerciseSide: 'alternating' }))
        .seconds
    ).toBe(expectedSeconds);
  });

  it('karta pokazuje ten sam czas', () => {
    render(<ExerciseExecutionCard mode="view" exercise={fromExerciseMapping(mappingOf(record))} />);
    expect(screen.getAllByText(formatExerciseDuration(expectedSeconds, false)).length).toBeGreaterThan(0);
  });

  it('wydruk i podsumowanie: etykieta mówi, co znaczy liczba', () => {
    const pdf = toPdfExercise(mappingOf(record));
    expect(pdf.alternatingPerSide).toBe(perSide);
    expect(translateExerciseSidePolish(pdf.exerciseSide, pdf.alternatingPerSide)).toBe(
      perSide ? 'Naprzemiennie, na każdą stronę' : 'Naprzemiennie, łącznie'
    );
  });

  it('etykieta strony w karcie i podpowiedź', () => {
    const fields = normalizeExerciseFieldValues({ ...record, side: 'alternating' });
    expect(Boolean(fields.alternatingPerSide)).toBe(perSide);
    expect(formatSideLabel('alternating', fields.alternatingPerSide)).toBe(
      perSide ? 'Naprzemiennie, na każdą stronę' : 'Naprzemiennie'
    );
    expect(getExerciseSideHelp(fields.alternatingPerSide)).toContain(
      perSide ? 'podana liczba na każdą stronę' : 'podana liczba łącznie'
    );
  });
});

describe('stary rekord: wynik równy portalowi na main', () => {
  it('bez enrichmentData i bez wersji nic się nie zmienia', () => {
    const mapping = mappingOf({ enrichmentData: undefined });
    expect(estimateEffectiveExerciseSeconds(resolveEffectiveExerciseParams(mapping))).toBe(209);
    expect(formatSideLabel('alternating')).toBe('Naprzemiennie');
    expect(translateExerciseSidePolish('alternating')).toBe('Naprzemiennie');
    expect(normalizeExerciseFieldValues({ side: 'alternating' })).not.toHaveProperty('alternatingPerSide');
  });
});
