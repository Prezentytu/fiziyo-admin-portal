import { describe, expect, it } from 'vitest';

import { toChatViewSpec, UNSUPPORTED_SPEC } from '../viewSpec';

describe('toChatViewSpec', () => {
  it('reads a flat dispatcher spec with nulls', () => {
    expect(
      toChatViewSpec({
        component: 'SetDraft',
        patientId: 'p-1',
        setId: null,
        exerciseIds: ['ex-1', 'ex-1', ' ', 'ex-2'],
        note: ' faza 2 ',
        query: null,
      })
    ).toEqual({
      component: 'SetDraft',
      patientId: 'p-1',
      setId: undefined,
      exerciseIds: ['ex-1', 'ex-2'],
      note: 'faza 2',
    });
  });

  it('degrades a card that misses its data to the closest useful one', () => {
    expect(toChatViewSpec({ component: 'SetDraft', patientId: 'p-1', exerciseIds: [] })).toEqual({
      component: 'PatientPeek',
      patientId: 'p-1',
    });
    expect(toChatViewSpec({ component: 'AssignSummary', setId: 's-1' })).toEqual({
      component: 'SetDraft',
      setId: 's-1',
      exerciseIds: [],
    });
    expect(toChatViewSpec({ component: 'ExerciseResults' })).toEqual(UNSUPPORTED_SPEC);
  });

  it('accepts only routes from the closed list', () => {
    expect(toChatViewSpec({ component: 'Navigate', route: 'patients' })).toEqual({
      component: 'Navigate',
      route: 'patients',
    });
    expect(toChatViewSpec({ component: 'Navigate', route: 'https://evil.example' })).toEqual(UNSUPPORTED_SPEC);
  });

  it('caps clarify options at four', () => {
    const spec = toChatViewSpec({ component: 'Clarify', question: 'Kto?', options: ['a', 'b', '', 'c', 'd', 'e'] });
    expect(spec).toEqual({ component: 'Clarify', question: 'Kto?', options: ['a', 'b', 'c', 'd'] });
  });

  it('rejects unknown components and malformed input', () => {
    expect(toChatViewSpec({ component: 'Html', html: '<script>' })).toEqual(UNSUPPORTED_SPEC);
    expect(toChatViewSpec('SetDraft')).toEqual(UNSUPPORTED_SPEC);
    expect(toChatViewSpec(null)).toEqual(UNSUPPORTED_SPEC);
  });
});
