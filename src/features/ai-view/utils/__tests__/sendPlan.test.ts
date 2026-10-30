import { describe, expect, it, vi } from 'vitest';

import { sendPlan, type SendPlanMutations } from '../sendPlan';
import type { DraftItem } from '../setDraft';

const NOW = new Date(2026, 9, 30, 12, 0);
const ITEM: DraftItem = {
  exerciseId: 'e1',
  sets: 3,
  reps: 10,
  duration: 0,
  executionTime: 3,
  restSets: 60,
  restReps: 0,
  preparationTime: 0,
};

function mutations(setId: string | null = 'set-1'): SendPlanMutations & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    createSet: vi.fn(async () => {
      calls.push('createSet');
      return setId;
    }),
    addExercise: vi.fn(async () => {
      calls.push('addExercise');
      return true;
    }),
    assign: vi.fn(async () => {
      calls.push('assign');
      return 'assignment-1';
    }),
  };
}

describe('sendPlan', () => {
  it('creates a patient plan, adds exercises in order, then assigns it', async () => {
    const writes = mutations();
    const result = await sendPlan(
      {
        organizationId: 'org-a',
        patientId: 'p1',
        draft: { name: ' Kolano · Jan ', sourceSetId: 'tpl-1', items: [ITEM, { ...ITEM, exerciseId: 'e2' }] },
        plan: { start: 'tomorrow', weeks: 4, rhythm: 'three' },
        now: NOW,
      },
      writes
    );

    expect(result).toEqual({ setId: 'set-1', assignmentId: 'assignment-1' });
    expect(writes.calls).toEqual(['createSet', 'addExercise', 'addExercise', 'assign']);
    expect(writes.createSet).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-a',
        name: 'Kolano · Jan',
        kind: 'PATIENT_PLAN',
        sourceExerciseSetId: 'tpl-1',
        isTemplate: false,
      })
    );
    expect(writes.addExercise).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ exerciseSetId: 'set-1', exerciseId: 'e2' })
    );
    expect(writes.assign).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseSetId: 'set-1',
        patientId: 'p1',
        startDate: new Date(2026, 9, 31).toISOString(),
        endDate: new Date(2026, 10, 27, 23, 59).toISOString(),
      })
    );
  });

  it('refuses an empty draft before writing anything', async () => {
    const writes = mutations();
    await expect(
      sendPlan(
        {
          organizationId: 'org-a',
          patientId: 'p1',
          draft: { name: 'X', items: [] },
          plan: { start: 'today', weeks: 2, rhythm: 'daily' },
        },
        writes
      )
    ).rejects.toThrow('Zestaw jest pusty.');
    expect(writes.calls).toEqual([]);
  });

  it('stops when the plan could not be created', async () => {
    const writes = mutations(null);
    await expect(
      sendPlan(
        {
          organizationId: 'org-a',
          patientId: 'p1',
          draft: { name: 'X', items: [ITEM] },
          plan: { start: 'today', weeks: 2, rhythm: 'daily' },
        },
        writes
      )
    ).rejects.toThrow();
    expect(writes.calls).toEqual(['createSet']);
  });
});
