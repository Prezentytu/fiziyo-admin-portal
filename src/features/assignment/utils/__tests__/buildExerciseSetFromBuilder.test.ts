import { describe, expect, it } from 'vitest';
import { toPdfExercises } from '@/components/pdf/pdfExerciseUtils';
import { buildExerciseSetFromBuilder } from '../buildExerciseSetFromBuilder';
import { buildAssignmentOverrideDeltasFromBuilder, stringifyAssignmentOverrides } from '../buildAssignmentOverrideDeltas';

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

  it('karta z ekranu sukcesu łączy mappingi buildera z deltami przypisania po instanceId', () => {
    const builderInstances = [{ instanceId: 'instance-1', exerciseId: 'exercise-1' }];
    const builderParams = new Map([
      ['instance-1', { sets: 3, reps: 10, patientDescription: 'Opis dla pacjenta', exerciseSide: 'left' }],
    ]);
    const availableExercises = [{ id: 'exercise-1', name: 'Wykrok', type: 'reps', side: 'both' }];

    const set = buildExerciseSetFromBuilder({ setId: 'set-1', setName: 'Plan', builderInstances, builderParams, availableExercises });
    const overrides = stringifyAssignmentOverrides(
      buildAssignmentOverrideDeltasFromBuilder(builderInstances, builderParams, availableExercises)
    );
    const [exercise] = toPdfExercises(set.exerciseMappings, overrides);

    expect(exercise.description).toBe('Opis dla pacjenta');
    expect(exercise.exerciseSide).toBe('left');
    expect(exercise.sets).toBe(3);
  });
});
