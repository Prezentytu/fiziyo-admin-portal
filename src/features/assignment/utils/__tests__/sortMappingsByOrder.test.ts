import { describe, expect, it } from 'vitest';
import { sortMappingsByOrder } from '../sortMappingsByOrder';
import { buildBuilderStateFromMappings } from '../seedBuilderParamsFromMapping';
import { computeExerciseDiff, type ExerciseMappingSnapshot } from '../exerciseDiff';
import type { ExerciseMapping } from '../../types';

function apiMappingsInReverseOrder(): ExerciseMapping[] {
  const second: ExerciseMapping = { id: 'm-second', exerciseId: 'e-second', order: 2, sets: 3, reps: 10 };
  const first: ExerciseMapping = { id: 'm-first', exerciseId: 'e-first', order: 1, sets: 2, reps: 8 };
  return [Object.freeze(second), Object.freeze(first)] as ExerciseMapping[];
}

describe('sortMappingsByOrder (CROSS02)', () => {
  it('odpowiedź API [order=2, order=1] daje plan zapisany jako [order=1, order=2]', () => {
    const { instances } = buildBuilderStateFromMappings(apiMappingsInReverseOrder());

    // AssignmentWizard.handleSubmit saves each builder instance with order = index + 1
    const savedPlan = instances.map((instance, index) => ({ exerciseId: instance.exerciseId, order: index + 1 }));

    expect(savedPlan).toEqual([
      { exerciseId: 'e-first', order: 1 },
      { exerciseId: 'e-second', order: 2 },
    ]);
  });

  it('edycja bez zmian nie przestawia kolejności przy nieposortowanej odpowiedzi API', () => {
    const mappings = sortMappingsByOrder(apiMappingsInReverseOrder());
    const snapshots: ExerciseMappingSnapshot[] = mappings.map((mapping) => ({
      mappingId: mapping.id,
      exerciseId: mapping.exerciseId,
      order: mapping.order ?? 0,
      params: { sets: mapping.sets, reps: mapping.reps },
    }));
    const instances = mappings.map((mapping) => ({ instanceId: `existing-${mapping.id}`, exerciseId: mapping.exerciseId }));
    const params = new Map(snapshots.map((snapshot) => [`existing-${snapshot.mappingId}`, snapshot.params]));

    const diff = computeExerciseDiff(snapshots, { instances, params });

    expect(diff.updated).toEqual([]);
  });

  it('nie mutuje tablicy wejściowej (cache Apollo)', () => {
    const response = Object.freeze(apiMappingsInReverseOrder());

    const sorted = sortMappingsByOrder(response);

    expect(sorted.map((mapping) => mapping.id)).toEqual(['m-first', 'm-second']);
    expect(response.map((mapping) => mapping.id)).toEqual(['m-second', 'm-first']);
    expect(sorted[0]).toBe(response[1]);
  });

  it('mappingi bez order zostają za uporządkowanymi w kolejności odpowiedzi', () => {
    const sorted = sortMappingsByOrder([{ id: 'x' }, { id: 'b', order: 2 }, { id: 'y' }, { id: 'a', order: 1 }]);

    expect(sorted.map((mapping) => mapping.id)).toEqual(['a', 'b', 'x', 'y']);
  });

  it('obsługuje brak mappingów', () => {
    expect(sortMappingsByOrder(undefined)).toEqual([]);
    expect(buildBuilderStateFromMappings(null).instances).toEqual([]);
  });
});
