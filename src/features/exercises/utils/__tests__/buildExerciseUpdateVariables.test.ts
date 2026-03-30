import { describe, expect, it } from 'vitest';

import { buildExerciseUpdateVariables } from '../buildExerciseUpdateVariables';

describe('buildExerciseUpdateVariables', () => {
  it('includes name in update payload', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: {
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
      },
    });

    expect(result.name).toBe('Nowa nazwa');
    expect(result.exerciseId).toBe('exercise-1');
  });

  it('maps none side to null', () => {
    const result = buildExerciseUpdateVariables({
      exerciseId: 'exercise-1',
      values: {
        name: 'Nowa nazwa',
        description: '',
        type: 'time',
        sets: null,
        reps: null,
        duration: 60,
        restSets: 60,
        restReps: 30,
        preparationTime: 5,
        executionTime: 20,
        exerciseSide: 'none',
        videoUrl: '',
        notes: '',
        tempo: '',
        clinicalDescription: '',
        audioCue: '',
        rangeOfMotion: '',
      },
    });

    expect(result.exerciseSide).toBeNull();
  });
});
