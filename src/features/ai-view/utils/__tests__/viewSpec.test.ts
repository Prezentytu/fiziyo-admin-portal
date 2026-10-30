import { describe, expect, it } from 'vitest';

import { MAX_REPLY_LENGTH, parseDispatchReply, toChatViewSpec, UNSUPPORTED_SPEC } from '../viewSpec';

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

describe('parseDispatchReply', () => {
  it('reads the new add-patient and create-exercise cards from the flat wire fields', () => {
    expect(parseDispatchReply({ component: 'AddPatient', query: 'Anna Nowak' }, 'Dodaję.')).toEqual({
      text: 'Dodaję.',
      spec: { component: 'AddPatient', name: 'Anna Nowak' },
    });
    expect(
      parseDispatchReply({ component: 'CreateExercise', query: 'Mostek', note: 'Na jednej nodze' }, null)
    ).toEqual({ text: undefined, spec: { component: 'CreateExercise', name: 'Mostek', description: 'Na jednej nodze' } });
  });

  it('answers a message with text only, and with the fallback card when text is missing', () => {
    expect(parseDispatchReply({ component: 'Message' }, ' Umiem ułożyć zestaw. ')).toEqual({ text: 'Umiem ułożyć zestaw.' });
    expect(parseDispatchReply({ component: 'Message' }, '')).toEqual({ spec: UNSUPPORTED_SPEC });
  });

  it('caps the text length', () => {
    const reply = parseDispatchReply({ component: 'Message' }, 'a'.repeat(MAX_REPLY_LENGTH + 50));
    expect(reply.text).toHaveLength(MAX_REPLY_LENGTH);
  });
});
