import { describe, expect, it, vi } from 'vitest';

import { sendPlan, sentText, type SendPlanMutations } from '../sendPlan';
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

  // SPEC-068 (K1): tryb „Zastąp obecny plan” zamyka stare przypisanie dopiero po przypisaniu nowego planu.
  it('completes the replaced assignment after assigning the new plan', async () => {
    const writes = {
      ...mutations(),
      completeAssignment: vi.fn(async () => undefined),
    };
    const result = await sendPlan(
      {
        organizationId: 'org-a',
        patientId: 'p1',
        draft: { name: 'Kolano v2', items: [ITEM] },
        plan: { start: 'tomorrow', weeks: 2, rhythm: 'daily' },
        replaceAssignmentId: 'assign-old',
        now: NOW,
      },
      writes
    );

    expect(result).toEqual({ setId: 'set-1', assignmentId: 'assignment-1', replacedAssignmentId: 'assign-old' });
    expect(writes.completeAssignment).toHaveBeenCalledTimes(1);
    expect(writes.completeAssignment).toHaveBeenCalledWith('assign-old');
  });

  it('never completes the old assignment when creating the new plan fails', async () => {
    const writes = {
      ...mutations(null),
      completeAssignment: vi.fn(async () => undefined),
    };
    await expect(
      sendPlan(
        {
          organizationId: 'org-a',
          patientId: 'p1',
          draft: { name: 'Kolano v2', items: [ITEM] },
          plan: { start: 'tomorrow', weeks: 2, rhythm: 'daily' },
          replaceAssignmentId: 'assign-old',
        },
        writes
      )
    ).rejects.toThrow();
    expect(writes.completeAssignment).not.toHaveBeenCalled();
  });
});

// Test asystenta 17.11 (K5, P14): „Wysłane. Tomasz zobaczy plan w aplikacji”, a pacjent miał status „Bez konta”.
describe('sentText', () => {
  const plan = 'od jutra, 18 listopada · 2 tygodnie · codziennie';

  it('promises the app only to a patient who has an account', () => {
    expect(sentText({ name: 'Kacper Zielinski', isShadowUser: false }, plan)).toBe(
      `Wysłane. Kacper Zielinski zobaczy plan w aplikacji: ${plan}.`
    );
  });

  it('says the patient has no account yet and what to do next', () => {
    const text = sentText({ name: 'Halina Kowalczyk', isShadowUser: true }, plan);
    expect(text).not.toContain('zobaczy plan w aplikacji');
    expect(text).toContain('Halina Kowalczyk nie ma jeszcze konta w aplikacji');
    expect(text).toContain('kod QR');
    expect(text).toContain('wydruk');
    expect(text).toContain(plan);
  });

  it('does not promise the app when the account state is unknown', () => {
    expect(sentText({ name: 'Jan Kowalski' }, plan)).not.toContain('zobaczy');
  });

  it('confirms when a previous active plan was replaced', () => {
    const text = sentText({ name: 'Kacper Lewandowski', isShadowUser: false }, plan, { replaced: true });
    expect(text).toContain('Plan zaktualizowany (poprzednia wersja została zastąpiona).');
    expect(text).toContain('Kacper Lewandowski zobaczy plan w aplikacji');
  });
});
