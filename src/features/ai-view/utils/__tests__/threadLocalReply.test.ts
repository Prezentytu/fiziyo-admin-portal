import { describe, expect, it } from 'vitest';

import type { ChatThreadMessage } from '../conversationStore';
import {
  countQuestion,
  exerciseIdeaQuery,
  localReplyTo,
  PICK_PATIENT_ANSWERED,
  withExerciseIdeas,
} from '../threadLocalReply';

const DRAFT = {
  name: 'Ból karku · 17.11',
  items: [
    {
      exerciseId: 'e1',
      sets: 2,
      reps: 10,
      duration: 0,
      executionTime: 3,
      restSets: 30,
      restReps: 0,
      preparationTime: 0,
    },
  ],
};

const PICK: ChatThreadMessage = {
  id: 'm1',
  role: 'assistant',
  text: 'Komu przypisać ten zestaw?',
  spec: { component: 'PickPatient', draft: DRAFT },
  source: 'local',
  creditsUsed: 0,
  createdAt: 1,
};

const PATIENTS = [
  { id: 'p1', name: 'Anna Kowalska' },
  { id: 'p2', name: 'Jan Nowak' },
  { id: 'p3', name: 'Jan Wiśniewski' },
];

describe('localReplyTo', () => {
  it('answers nothing when no patient question is open', () => {
    expect(localReplyTo('do Anny', [{ ...PICK, chosen: 'Anna' }], PATIENTS)).toBeNull();
    expect(localReplyTo('do Anny', [], PATIENTS)).toBeNull();
  });

  it('a question or a new command is not taken for a name', () => {
    expect(localReplyTo('ilu mam pacjentów w bazie?', [PICK], PATIENTS)).toBeNull();
    expect(localReplyTo('pokaż ćwiczenia na kolano', [PICK], PATIENTS)).toBeNull();
    expect(localReplyTo('a ile mam cwiczen', [PICK], PATIENTS)).toBeNull();
  });

  it('a known patient goes straight to the schedule', () => {
    const local = localReplyTo('do Anny Kowalskiej', [PICK], PATIENTS);
    expect(local).toMatchObject({
      answeredMessageId: 'm1',
      chosen: 'Anna Kowalska',
      reply: { spec: { component: 'Schedule', draft: { patientId: 'p1' } } },
    });
  });

  it('several matches: a choice limited to them', () => {
    expect(localReplyTo('dla Jana', [PICK], PATIENTS)?.reply.spec).toEqual({
      component: 'PickPatient',
      draft: DRAFT,
      patientIds: ['p2', 'p3'],
    });
  });

  it('nobody: the new patient form, named, asking for an e-mail or phone', () => {
    const local = localReplyTo('do jarka adamowskiego', [PICK], PATIENTS);
    expect(local?.chosen).toBe(PICK_PATIENT_ANSWERED);
    expect(local?.reply.text).toContain('Jarek Adamowski');
    expect(local?.reply.text).toContain('e-mail');
    expect(local?.reply.spec).toEqual({
      component: 'PickPatient',
      draft: DRAFT,
      newPatient: { name: 'Jarek Adamowski' },
    });
  });
});

describe('withExerciseIdeas', () => {
  it('adds ideas for new exercises to an exercise question answered only in words', () => {
    const reply = withExerciseIdeas('Przygotuj mi propozycje 3 cwiczeń na wzmocnienie paliczków dloni', {
      text: 'W katalogu nie ma ćwiczeń wzmacniających paliczki dłoni.',
    });
    expect(reply.spec).toEqual({ component: 'ExerciseIdeas', query: 'wzmocnienie paliczków dloni' });
  });

  it('leaves a reply with a card and other questions as they are', () => {
    const withCard = { text: 'Są', spec: { component: 'ExerciseResults' as const, query: 'kolano', exerciseIds: [] } };
    expect(withExerciseIdeas('ćwiczenia na kolano', withCard)).toBe(withCard);
    expect(withExerciseIdeas('Kto nie ćwiczy?', { text: 'Wszyscy ćwiczą.' }).spec).toBeUndefined();
  });
});

describe('exerciseIdeaQuery', () => {
  it.each([
    ['Ćwiczenia na rozciąganie barku', 'rozciąganie barku'],
    ['Znajdź ćwiczenie wzmacniające kolano?', 'wzmacniające kolano'],
    ['mobilizacja kręgosłupa piersiowego', 'mobilizacja kręgosłupa piersiowego'],
  ])('%s → %s', (question, expected) => {
    expect(exerciseIdeaQuery(question)).toBe(expected);
  });
});

describe('countQuestion', () => {
  it.each([
    ['ilu mam pacjentów w bazie?', 'patients'],
    ['a ile mam cwiczen', 'exercises'],
    ['Ile ćwiczeń jest w katalogu', 'exercises'],
    ['ile mam zestawów', 'sets'],
  ])('%s → %s', (text, focus) => {
    expect(countQuestion(text)).toBe(focus);
  });

  it('leaves other questions to the assistant', () => {
    expect(countQuestion('ile serii dać na kolano?')).toBeNull();
    expect(countQuestion('pokaż pacjentów')).toBeNull();
  });
});
