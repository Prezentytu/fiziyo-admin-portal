import { describe, expect, it } from 'vitest';
import { computeExerciseDiff, type ExerciseMappingSnapshot } from '../exerciseDiff';

describe('computeExerciseDiff', () => {
  const initial: ExerciseMappingSnapshot[] = [
    {
      mappingId: 'm1',
      exerciseId: 'e1',
      order: 1,
      params: {
        sets: 3,
        reps: 10,
      },
    },
    {
      mappingId: 'm2',
      exerciseId: 'e2',
      order: 2,
      params: {
        sets: 4,
        reps: 12,
      },
    },
  ];

  it('returns no changes when current state matches initial snapshot', () => {
    const result = computeExerciseDiff(initial, {
      instances: [
        { instanceId: 'existing-m1', exerciseId: 'e1' },
        { instanceId: 'existing-m2', exerciseId: 'e2' },
      ],
      params: new Map([
        ['existing-m1', { sets: 3, reps: 10 }],
        ['existing-m2', { sets: 4, reps: 12 }],
      ]),
    });

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  it('detects removed mappings', () => {
    const result = computeExerciseDiff(initial, {
      instances: [{ instanceId: 'existing-m1', exerciseId: 'e1' }],
      params: new Map([['existing-m1', { sets: 3, reps: 10 }]]),
    });

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]?.mappingId).toBe('m2');
    expect(result.added).toEqual([]);
  });

  it('detects added mappings', () => {
    const result = computeExerciseDiff(initial, {
      instances: [
        { instanceId: 'existing-m1', exerciseId: 'e1' },
        { instanceId: 'existing-m2', exerciseId: 'e2' },
        { instanceId: 'new-1', exerciseId: 'e3' },
      ],
      params: new Map([
        ['existing-m1', { sets: 3, reps: 10 }],
        ['existing-m2', { sets: 4, reps: 12 }],
        ['new-1', { sets: 2, duration: 45 }],
      ]),
    });

    expect(result.added).toHaveLength(1);
    expect(result.added[0]?.instance.exerciseId).toBe('e3');
    expect(result.added[0]?.order).toBe(3);
  });

  it('detects updated params and order changes', () => {
    const result = computeExerciseDiff(initial, {
      instances: [
        { instanceId: 'existing-m2', exerciseId: 'e2' },
        { instanceId: 'existing-m1', exerciseId: 'e1' },
      ],
      params: new Map([
        ['existing-m2', { sets: 4, reps: 12 }],
        ['existing-m1', { sets: 5, reps: 10 }],
      ]),
    });

    expect(result.updated).toHaveLength(2);
    const updatedIds = result.updated.map((item) => item.mappingId);
    expect(updatedIds).toContain('m1');
    expect(updatedIds).toContain('m2');
  });
});
