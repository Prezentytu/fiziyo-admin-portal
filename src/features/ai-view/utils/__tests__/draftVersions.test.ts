import { describe, expect, it } from 'vitest';

import type { ChatThreadMessage } from '../conversationStore';
import { canRestoreDraft, lockSupersededDrafts, restoredDraftSpec, supersededDraftIds } from '../draftVersions';
import type { DraftItem } from '../setDraft';

type Spec = Extract<ChatThreadMessage, { role: 'assistant' }>['spec'];

function card(id: string, spec: Spec, chosen?: string): ChatThreadMessage {
  return { id, role: 'assistant', spec, chosen, source: 'ai', creditsUsed: 0, createdAt: 1 };
}
const user = (id: string, text: string): ChatThreadMessage => ({ id, role: 'user', text, createdAt: 1 });
const draft = (exerciseIds: string[], patientId?: string): Spec => ({ component: 'SetDraft', exerciseIds, patientId });

const ROW: DraftItem = {
  exerciseId: 'e1',
  sets: 4,
  reps: 12,
  duration: 0,
  executionTime: 3,
  restSets: 45,
  restReps: 2,
  preparationTime: 10,
  tempo: '2-1-2',
  notes: 'bez bólu',
};

// Decyzja właściciela 18.11: aktywna jest tylko najnowsza propozycja zestawu, wcześniejsze czekają zablokowane.
describe('supersededDraftIds', () => {
  it('leaves only the newest open proposal of the same work active', () => {
    const messages = [
      card('m1', draft(['e1'])),
      user('u1', 'zamień e1 na e2'),
      card('m2', draft(['e2'])),
      card('m3', draft(['e2', 'e3'])),
    ];
    expect([...supersededDraftIds(messages)]).toEqual(['m2', 'm1']);
  });

  it('does not touch a finished flow, a card already spent, or a proposal for another patient', () => {
    const messages = [
      card('old', draft(['e1'], 'p1')),
      card('sent', { component: 'Sent', patientId: 'p1', setName: 'Kolano', planLabel: 'od jutra' }),
      card('other', draft(['e5'], 'p2')),
      card('spent', draft(['e1'], 'p1'), 'next'),
      card('m1', draft(['e1'], 'p1')),
      card('m2', draft(['e2'], 'p1')),
    ];
    expect([...supersededDraftIds(messages)]).toEqual(['m1']);
  });

  it('counts a proposal without a patient as the same work, and a known set for a patient as a proposal', () => {
    const messages = [
      card('m1', { component: 'AssignSummary', patientId: 'p1', setId: 's1' }),
      card('m2', draft(['e2'])),
    ];
    expect([...supersededDraftIds(messages)]).toEqual(['m1']);
    expect(supersededDraftIds([card('m1', draft(['e1']))]).size).toBe(0);
  });
});

describe('lockSupersededDrafts', () => {
  const live = (id: string) =>
    id === 'm1'
      ? {
          draft: { exerciseIds: ['e1'], note: 'nazwa zestawu', doses: { e1: { sets: 4, reps: 12 } }, items: [ROW] },
          catalog: [],
        }
      : undefined;

  it('locks the earlier proposal and keeps in its card what the therapist had set there', () => {
    const messages = [
      card('m1', { component: 'SetDraft', exerciseIds: ['e1'], note: 'biodro' }),
      card('m2', draft(['e2'])),
    ];
    const next = lockSupersededDrafts(messages, live);

    expect(next[0]).toMatchObject({
      chosen: 'superseded',
      spec: {
        component: 'SetDraft',
        exerciseIds: ['e1'],
        note: 'biodro',
        doses: { e1: { sets: 4, reps: 12 } },
        items: [ROW],
      },
    });
    expect(next[1]).toBe(messages[1]);
  });

  it('keeps the catalog set of a known-set card and returns the same list when nothing changes', () => {
    const summary = [
      card('m1', { component: 'AssignSummary', patientId: 'p1', setId: 's1' }),
      card('m2', draft(['e2'])),
    ];
    expect(lockSupersededDrafts(summary, live)[0]).toMatchObject({
      chosen: 'superseded',
      spec: { component: 'SetDraft', setId: 's1', patientId: 'p1', exerciseIds: ['e1'], items: [ROW] },
    });

    const single = [card('m1', draft(['e1']))];
    expect(lockSupersededDrafts(single, live)).toBe(single);
    const older = [card('m1', draft(['e1']), 'superseded'), card('m2', draft(['e2']))];
    expect(lockSupersededDrafts(older, () => undefined)).toBe(older);
  });

  it('keeps the rows of a proposal that went on to a new exercise, so it can be returned to', () => {
    const messages = [card('m1', draft(['e1']), 'create-exercise'), card('m2', { component: 'CreateExercise' })];
    expect(lockSupersededDrafts(messages, live)[0]).toMatchObject({
      chosen: 'create-exercise',
      spec: { items: [ROW] },
    });
  });
});

describe('restoredDraftSpec', () => {
  it('brings a version back with every row as the card has it, without the „nowe” mark', () => {
    expect(
      restoredDraftSpec(
        { component: 'SetDraft', exerciseIds: ['e0'], note: 'biodro', patientId: 'p1', addedExerciseId: 'e0' },
        [ROW]
      )
    ).toEqual({
      component: 'SetDraft',
      exerciseIds: ['e1'],
      note: 'biodro',
      patientId: 'p1',
      doses: { e1: { sets: 4, reps: 12 } },
      items: [ROW],
    });
  });

  it('is offered only on a proposal a newer one replaced, never on a sent or saved one', () => {
    expect(['superseded', 'added', 'create-exercise'].map(canRestoreDraft)).toEqual([true, true, true]);
    expect([undefined, 'next', 'saved'].map(canRestoreDraft)).toEqual([false, false, false]);
  });
});
