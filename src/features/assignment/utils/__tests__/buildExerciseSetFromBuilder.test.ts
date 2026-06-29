import { describe, expect, it } from 'vitest';
import { buildExerciseSetFromBuilder } from '../buildExerciseSetFromBuilder';

describe('buildExerciseSetFromBuilder', () => {
  it('maps all builder instances to exerciseMappings for PDF/success flows', () => {
    const result = buildExerciseSetFromBuilder({
      setId: 'set-1',
      setName: 'Plan testowy',
      builderInstances: [
        { instanceId: 'instance-1', exerciseId: 'exercise-1' },
        { instanceId: 'instance-2', exerciseId: 'exercise-2' },
      ],
      builderParams: new Map([
        ['instance-1', { sets: 3, reps: 10, customName: 'Przysiad goblet' }],
        ['instance-2', { sets: 4, executionTime: 45, notes: 'Spokojne tempo' }],
      ]),
      availableExercises: [
        { id: 'exercise-1', name: 'Goblet squat', type: 'reps' },
        { id: 'exercise-2', name: 'Plank bokiem', type: 'time' },
      ],
    });

    expect(result.exerciseMappings).toHaveLength(2);
    expect(result.exerciseMappings?.[0]).toMatchObject({
      id: 'instance-1',
      exerciseId: 'exercise-1',
      order: 1,
      sets: 3,
      reps: 10,
      customName: 'Przysiad goblet',
      exercise: { id: 'exercise-1', name: 'Goblet squat' },
    });
    expect(result.exerciseMappings?.[1]).toMatchObject({
      id: 'instance-2',
      exerciseId: 'exercise-2',
      order: 2,
      sets: 4,
      executionTime: 45,
      notes: 'Spokojne tempo',
      exercise: { id: 'exercise-2', name: 'Plank bokiem' },
    });
  });
});
