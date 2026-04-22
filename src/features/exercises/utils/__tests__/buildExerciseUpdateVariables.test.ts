import { describe, expect, it } from 'vitest';

import { buildExerciseUpdateVariables } from '../buildExerciseUpdateVariables';
import type { ExerciseFormValues } from '../../ExerciseForm';

const baseValues: ExerciseFormValues = {
  name: 'Nowa nazwa',
  description: 'Opis',
  type: 'reps',
  sets: 3,
  reps: 10,
  duration: null,
  restSets: 60,
  restReps: 30,
  preparationTime: 5,
  executionTime: null,
  exerciseSide: 'none',
  videoUrl: '',
  notes: '',
  tempo: '',
  clinicalDescription: '',
  audioCue: '',
  rangeOfMotion: '',
};

describe('buildExerciseUpdateVariables', () => {
  it('includes name in update payload', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: baseValues,
    });

    expect(result.name).toBe('Nowa nazwa');
    expect(result.exerciseId).toBe('exercise-1');
  });

  it('maps none side to null', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: { ...baseValues, type: 'time', sets: null, reps: null, duration: 60, executionTime: 20 },
    });

    expect(result.exerciseSide).toBeNull();
  });

  it('passes through tag IDs when provided', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: {
        ...baseValues,
        mainTags: ['tag-a', 'tag-b'],
        additionalTags: ['tag-c'],
      },
    });

    expect(result.mainTags).toEqual(['tag-a', 'tag-b']);
    expect(result.additionalTags).toEqual(['tag-c']);
  });

  it('emits undefined for tags when missing so backend keeps existing values', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: baseValues,
    });

    expect(result.mainTags).toBeUndefined();
    expect(result.additionalTags).toBeUndefined();
  });

  it('passes through difficultyLevel and load fields when provided', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: {
        ...baseValues,
        difficultyLevel: 'Hard',
        loadType: 'weight',
        loadValue: 12.5,
        loadUnit: 'kg',
        loadText: '12.5 kg',
      },
    });

    expect(result.difficultyLevel).toBe('Hard');
    expect(result.loadType).toBe('weight');
    expect(result.loadValue).toBe(12.5);
    expect(result.loadUnit).toBe('kg');
    expect(result.loadText).toBe('12.5 kg');
  });

  it('emits undefined for load fields when missing so backend keeps existing values', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: baseValues,
    });

    expect(result.difficultyLevel).toBeUndefined();
    expect(result.loadType).toBeUndefined();
    expect(result.loadValue).toBeUndefined();
    expect(result.loadUnit).toBeUndefined();
    expect(result.loadText).toBeUndefined();
  });

  it('preserves required core fields regardless of optional passthroughs', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: { ...baseValues, exerciseSide: 'left', tempo: '3-0-1-0', notes: 'note' },
    });

    expect(result.exerciseSide).toBe('left');
    expect(result.tempo).toBe('3-0-1-0');
    expect(result.notes).toBe('note');
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(10);
  });
});
