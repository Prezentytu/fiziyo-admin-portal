import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { BuilderExercise } from '@/contexts/ExerciseBuilderContext';

import { buildBuilderExerciseMapping } from './buildBuilderExerciseMapping';

function catalogBothSquat(overrides: Partial<BuilderExercise> = {}): BuilderExercise {
  return {
    id: 'ex-squat',
    name: 'Przysiad',
    side: 'BOTH',
    exerciseSide: 'both',
    sets: 3,
    reps: 10,
    duration: 0,
    executionTime: 5,
    restSets: 60,
    restReps: 0,
    preparationTime: 0,
    ...overrides,
  };
}

describe('buildBuilderExerciseMapping', () => {
  it('writes Razem over catalog Both so the patient plan does not keep volume ×2', () => {
    const mapping = buildBuilderExerciseMapping(
      catalogBothSquat({
        exerciseSide: 'none',
      })
    );

    expect(JSON.parse(mapping.overridesJson ?? '{}')).toEqual({ exerciseSide: 'none' });
    expect(mapping.exerciseId).toBe('ex-squat');
    expect(mapping.sets).toBe(3);
    expect(mapping.reps).toBe(10);
    expect(mapping.executionTime).toBe(5);
  });

  it('writes Na każdą stronę when the therapist upgrades catalog Razem', () => {
    const mapping = buildBuilderExerciseMapping(
      catalogBothSquat({
        side: 'NONE',
        exerciseSide: 'both',
      })
    );

    expect(JSON.parse(mapping.overridesJson ?? '{}')).toEqual({ exerciseSide: 'both' });
  });

  it('omits overridesJson when the sidebar left catalog side unchanged', () => {
    const mapping = buildBuilderExerciseMapping(catalogBothSquat());

    expect(mapping.overridesJson).toBe('');
  });

  it('CreateSetDialog sends sidebar cards through the mapping helper', () => {
    const source = readFileSync(path.join(__dirname, 'CreateSetDialog.tsx'), 'utf8');
    expect(source).toContain('buildBuilderExerciseMapping');
    expect(source).toContain('selectedExercises.map(buildBuilderExerciseMapping)');
  });
});
