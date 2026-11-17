import { describe, expect, it, vi } from 'vitest';

import { ChatDispatchError, guardCardPatient, replyText, resolveReply, type Dispatcher } from '../resolveReply';

const CONTEXT = { patients: [{ id: 'p-jan', name: 'Jan Kowalski' }], sets: [] };

describe('resolveReply', () => {
  it('uses the AI dispatcher when allowed', async () => {
    const dispatch: Dispatcher = vi.fn(async () => ({
      sessionId: 's-1',
      spec: { component: 'PatientPeek' as const, filter: 'inactive' as const },
      creditsUsed: 1,
    }));
    const reply = await resolveReply('kto nie ćwiczy', { useAi: true, context: CONTEXT, dispatch });
    expect(reply).toEqual({
      text: 'Ci pacjenci ostatnio nie ćwiczą. Możesz im przypomnieć jednym kliknięciem.',
      spec: { component: 'PatientPeek', filter: 'inactive' },
      source: 'ai',
      sessionId: 's-1',
      creditsUsed: 1,
    });
  });

  it('falls back to rules with the failure reason', async () => {
    const dispatch: Dispatcher = async () => {
      throw new ChatDispatchError('insufficient_credits', 'brak');
    };
    const reply = await resolveReply('zestaw dla Jana Kowalskiego', { useAi: true, context: CONTEXT, dispatch });
    expect(reply).toEqual({
      text: 'Tak wygląda teraz plan: Jan Kowalski.',
      spec: { component: 'PatientPeek', patientId: 'p-jan' },
      source: 'rules',
      creditsUsed: 0,
      fallbackReason: 'insufficient_credits',
    });
  });

  it('treats unexpected errors as an unavailable model', async () => {
    const dispatch: Dispatcher = async () => {
      throw new TypeError('network');
    };
    const reply = await resolveReply('kto nie ćwiczy', { useAi: true, context: CONTEXT, dispatch });
    expect(reply.fallbackReason).toBe('unavailable');
  });

  it('never calls the model when AI is off', async () => {
    const dispatch = vi.fn<Dispatcher>();
    const reply = await resolveReply('kto nie ćwiczy', { useAi: false, context: CONTEXT, dispatch });
    expect(dispatch).not.toHaveBeenCalled();
    expect(reply.source).toBe('rules');
  });

  it('keeps the model text above the card', async () => {
    const dispatch: Dispatcher = async () => ({
      sessionId: 's-2',
      text: 'Trzech pacjentów nie ćwiczy od tygodnia.',
      spec: { component: 'PatientPeek' as const, filter: 'inactive' as const },
      creditsUsed: 1,
    });
    const reply = await resolveReply('kto nie ćwiczy', { useAi: true, context: CONTEXT, dispatch });
    expect(reply.text).toBe('Trzech pacjentów nie ćwiczy od tygodnia.');
  });
});

describe('replyText', () => {
  it('describes the card when the model gave no text', () => {
    expect(replyText(undefined, { component: 'AddPatient', name: 'Anna Nowak' }, CONTEXT)).toBe(
      'Uzupełnij dane, a dodam pacjenta: Anna Nowak.'
    );
  });

  it('describes the add-patient route as the form it opens', () => {
    expect(replyText('  ', { component: 'Navigate', route: 'patient-new' }, CONTEXT)).toBe(
      'Uzupełnij dane, a dodam pacjenta.'
    );
  });

  it('appends the clarify question the model left out of its text', () => {
    const spec = { component: 'Clarify' as const, question: 'Którą Ewę?', options: ['Ewa W.', 'Ewa N.'] };
    expect(replyText('Mam dwie osoby o tym imieniu.', spec, CONTEXT)).toBe(
      'Mam dwie osoby o tym imieniu.\n\nKtórą Ewę?'
    );
    expect(replyText('Którą Ewę?', spec, CONTEXT)).toBe('Którą Ewę?');
  });

  it('describes an empty draft as one to fill, not as proposed exercises', () => {
    const text = replyText(undefined, { component: 'SetDraft', exerciseIds: [] }, CONTEXT);
    expect(text).not.toContain('Proponuję');
    expect(text).toContain('Dodaj ćwiczenia');
  });

  it('is empty for no text and no card', () => {
    expect(replyText(undefined, undefined, CONTEXT)).toBe('');
  });
});

describe('guardCardPatient', () => {
  const context = {
    patients: [
      { id: 'p-jan', name: 'Jan Czat-Kowalski' },
      { id: 'p-e2e', name: 'E2E Pacjent' },
    ],
    sets: [],
  };
  const draftForE2e = { component: 'SetDraft' as const, patientId: 'p-e2e', exerciseIds: ['e1'] };

  // Report 01.11 (P0-1): after "Dodano: Jan" the model put "clamshell, bird dog" on another patient's card.
  it('drops a patient the message does not name when the conversation is about someone else', () => {
    expect(guardCardPatient(draftForE2e, 'clamshell, bird dog', context, 'p-jan')).toEqual({
      component: 'SetDraft',
      patientId: undefined,
      exerciseIds: ['e1'],
    });
    expect(
      guardCardPatient({ component: 'AssignSummary', patientId: 'p-e2e', setId: 's1' }, 'ten sam', context, 'p-jan')
    ).toEqual({ component: 'SetDraft', setId: 's1', exerciseIds: [] });
  });

  it('keeps the patient the message names and the conversation patient', () => {
    expect(guardCardPatient(draftForE2e, 'zestaw dla E2E Pacjent', context, 'p-jan')).toBe(draftForE2e);
    expect(guardCardPatient(draftForE2e, 'clamshell', context, 'p-e2e')).toBe(draftForE2e);
    expect(guardCardPatient(draftForE2e, 'dodaj mu jeszcze mostek', context, 'p-e2e')).toBe(draftForE2e);
  });

  // Test asystenta 17.11 (K1): nowa rozmowa, „Pacjent z rwą kulszową pyta…” → karta „dla: E2E Pacjent”.
  it('drops a patient nobody named in a conversation that is about no one yet', () => {
    const message = 'Pacjent z rwą kulszową pyta, czy może brać ketonal. Daj mu ślizgi nerwu kulszowego.';
    expect(guardCardPatient(draftForE2e, message, context, undefined)).toEqual({
      component: 'SetDraft',
      patientId: undefined,
      exerciseIds: ['e1'],
    });
    expect(
      guardCardPatient(
        { component: 'ExerciseResults', query: 'ślizgi', exerciseIds: ['e1'], patientId: 'p-e2e' },
        message,
        context,
        undefined
      )
    ).toEqual({ component: 'ExerciseResults', query: 'ślizgi', exerciseIds: ['e1'], patientId: undefined });
  });

  // Test asystenta 17.11 (K1b): „Nowa pacjentka Oksana… skopiuj jej zestaw Haliny Kowalczyk” → „dla: Tomas Nowi”.
  it('drops the conversation patient when the message names someone else or a new person', () => {
    const people = {
      patients: [
        { id: 'p-tomas', name: 'Tomas Nowi' },
        { id: 'p-halina', name: 'Halina Kowalczyk' },
      ],
      sets: [],
    };
    const draftForTomas = { component: 'SetDraft' as const, patientId: 'p-tomas', setId: 's1', exerciseIds: [] };
    const stripped = { component: 'SetDraft', patientId: undefined, setId: 's1', exerciseIds: [] };
    const copy = 'Nowa pacjentka Oksana Shevchenko, po endoprotezie. Skopiuj jej zestaw Haliny Kowalczyk.';
    expect(guardCardPatient(draftForTomas, copy, people, 'p-tomas')).toEqual(stripped);
    expect(guardCardPatient(draftForTomas, copy, people, undefined)).toEqual(stripped);
    expect(guardCardPatient(draftForTomas, 'to samo dla Haliny Kowalczyk', people, 'p-tomas')).toEqual(stripped);
    expect(guardCardPatient(draftForTomas, 'mam nową pacjentkę, daj jej to samo', people, 'p-tomas')).toEqual(
      stripped
    );
  });

  it('asks before showing the plan of a patient nobody named', () => {
    expect(
      guardCardPatient({ component: 'PatientPeek', patientId: 'p-e2e' }, 'Pacjent pyta o ketonal', context, undefined)
    ).toEqual({
      component: 'Clarify',
      question: 'Czy chodzi o pacjenta: E2E Pacjent?',
      options: ['E2E Pacjent'],
      choices: [{ label: 'E2E Pacjent', patientId: 'p-e2e' }],
    });
    const peek = { component: 'PatientPeek' as const, patientId: 'p-e2e' };
    expect(guardCardPatient(peek, 'co u E2E Pacjent?', context, undefined)).toBe(peek);
    const inactive = { component: 'PatientPeek' as const, filter: 'inactive' as const };
    expect(guardCardPatient(inactive, 'kto nie ćwiczy', context, undefined)).toBe(inactive);
  });

  it('applies to AI replies and drops the model sentence about the removed patient', async () => {
    const dispatch: Dispatcher = async () => ({
      sessionId: 's',
      text: 'Zestaw dla E2E Pacjent: clamshell.',
      spec: draftForE2e,
      creditsUsed: 1,
    });
    const reply = await resolveReply('clamshell, bird dog', {
      useAi: true,
      context,
      dispatch,
      contextPatientId: 'p-jan',
    });
    expect(reply.spec).toEqual({ component: 'SetDraft', patientId: undefined, exerciseIds: ['e1'] });
    expect(reply.text).not.toContain('E2E Pacjent');
  });
});
