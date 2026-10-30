import { describe, expect, it } from 'vitest';

import { toPdfExercise } from '@/components/pdf/pdfExerciseUtils';
import { resolveOverrideInheritedParams } from '@/features/patients/utils/overrideInheritedParams';
import { fromExerciseMapping } from '../adapters';
import { resolveEffectiveExerciseParams } from '../resolveEffectiveExerciseParams';

/**
 * Ten sam mapping bez kolumn parametrów (dziedziczy z ćwiczenia) w każdym widoku:
 * karta zestawu i kreator (resolver), podsumowanie i karty (fromExerciseMapping),
 * dialog nadpisań (inherited), PDF (toPdfExercise).
 */
describe('parametry ćwiczenia: ten sam zestaw, te same liczby', () => {
  const mapping = {
    id: 'mapping-1',
    exerciseId: 'exercise-1',
    exercise: {
      id: 'exercise-1',
      name: 'Wspięcia na palce',
      type: 'REPS',
      side: 'NONE',
      defaultSets: 3,
      defaultReps: 15,
      defaultExecutionTime: 2,
      defaultRestBetweenSets: 60,
      defaultRestBetweenReps: 0,
      preparationTime: 5,
    },
  };

  it('serie, przerwa i typ są zgodne we wszystkich widokach', () => {
    const resolved = resolveEffectiveExerciseParams(mapping);
    const card = fromExerciseMapping(mapping);
    const inherited = resolveOverrideInheritedParams(mapping);
    const pdf = toPdfExercise(mapping);

    for (const view of [resolved, card, inherited, pdf]) {
      expect(view.sets).toBe(3);
      expect(view.restSets).toBe(60);
      expect(view.restReps).toBe(0);
    }
    expect(resolved.preparationTime).toBe(5);
    expect(card.preparationTime).toBe(5);
    expect(inherited.preparationTime).toBe(5);

    expect(resolved.isTimeBased).toBe(false);
    expect(card.isTimeBased).toBe(false);
    expect(pdf.type).toBe('reps');
    expect(pdf.exerciseSide).toBe('none');
  });
});
