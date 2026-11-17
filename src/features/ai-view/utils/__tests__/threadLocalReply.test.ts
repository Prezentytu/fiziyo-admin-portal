import { describe, expect, it } from 'vitest';

import type { ChatThreadMessage } from '../conversationStore';
import {
  accountQuestionReply,
  countQuestion,
  exerciseIdeaQuery,
  isExerciseTopic,
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

// Test asystenta 17.11 (K7): „od dziś, 3 razy w tygodniu, 4 tygodnie” po pytaniu o harmonogram szło do modelu.
describe('localReplyTo: schedule typed as text', () => {
  const SCHEDULE: ChatThreadMessage = {
    id: 'm-schedule',
    role: 'assistant',
    text: 'Od kiedy i jak często?',
    spec: { component: 'Schedule', draft: { ...DRAFT, patientId: 'p1' } },
    source: 'local',
    creditsUsed: 0,
    createdAt: 2,
  };

  it('goes to the send summary with the typed plan, the draft and its patient', () => {
    const text = 'od dziś, 3 razy w tygodniu, 4 tygodnie';
    const local = localReplyTo(text, [PICK, SCHEDULE], PATIENTS);
    expect(local).toMatchObject({
      answeredMessageId: 'm-schedule',
      chosen: text,
      reply: {
        spec: {
          component: 'SendSummary',
          draft: { ...DRAFT, patientId: 'p1' },
          plan: { start: 'today', weeks: 4, rhythm: 'three' },
        },
      },
    });
    expect(local?.reply.text).toContain('Gotowe do wysłania');
  });

  it('says what it could not set instead of starting over', () => {
    const local = localReplyTo('od poniedziałku do piątku, 2 tygodnie', [SCHEDULE], PATIENTS);
    expect(local?.reply.spec).toMatchObject({ component: 'SendSummary', plan: { weeks: 2, rhythm: 'daily' } });
    expect(local?.reply.text).toContain('codziennie');
  });

  it('leaves a new request and an answered question to the assistant', () => {
    expect(localReplyTo('dodaj jeszcze mostek, 3 razy w tygodniu', [SCHEDULE], PATIENTS)).toBeNull();
    expect(localReplyTo('a czy 4 tygodnie to nie za długo?', [SCHEDULE], PATIENTS)).toBeNull();
    expect(localReplyTo('zamień przysiad na wykrok', [SCHEDULE], PATIENTS)).toBeNull();
    expect(localReplyTo('4 tygodnie', [{ ...SCHEDULE, chosen: 'Pasuje' }], PATIENTS)).toBeNull();
  });
});

// Test asystenta 17.11 (K5, P15, P56): „Czy Halina odebrała zestaw?” → model nie zna stanu konta, −1 kredyt.
describe('accountQuestionReply', () => {
  const patients = [
    { id: 'p-halina', name: 'Halina Kowalczyk', isShadowUser: true },
    { id: 'p-kacper', name: 'Kacper Zielinski', isShadowUser: false, lastActivity: '2026-11-17T10:00:00Z' },
    { id: 'p-nowy', name: 'Karolina Mazur', isShadowUser: false },
    { id: 'p-jan-1', name: 'Jan Kowalski', isShadowUser: true },
    { id: 'p-jan-2', name: 'Jan Kowalski', isShadowUser: false },
  ];

  it('says the patient has no account, so nothing was received', () => {
    const reply = accountQuestionReply('Czy Halina odebrała zestaw? Widziała go?', patients);
    expect(reply?.text).toContain('Halina Kowalczyk nie ma jeszcze konta w aplikacji');
    expect(reply?.spec).toEqual({ component: 'PatientPeek', patientId: 'p-halina' });
    expect(accountQuestionReply('czy Halina Kowalczyk dostała zaproszenie', patients)?.text).toContain('nie ma jeszcze konta');
  });

  it('says the patient has an account and whether they were active', () => {
    expect(accountQuestionReply('Czy Kacper dostał zaproszenie?', patients)?.text).toContain('ma konto w aplikacji');
    expect(accountQuestionReply('Czy Kacper odebrał plan?', patients)?.text).toContain('17 listopada');
    expect(accountQuestionReply('czy Karolina Mazur ma już konto?', patients)?.text).toContain('nie ma jeszcze aktywności');
  });

  it('leaves everything else to the assistant', () => {
    for (const text of [
      'Czy Jan Kowalski odebrał zestaw?',
      'Czy Oksana odebrała zestaw?',
      'Halina odebrała wyniki rezonansu, ułóż jej zestaw',
      'Czy Halina może już chodzić bez kuli?',
      'Wyślij Halinie zaproszenie',
    ]) {
      expect(accountQuestionReply(text, patients)).toBeNull();
    }
  });
});

// Test asystenta 17.11 (W16, P92): treść pytania trafiała na przycisk „Utwórz ćwiczenie: …”.
describe('isExerciseTopic', () => {
  const QUESTION =
    'Które ćwiczenia w moim katalogu są najczęściej przerywane albo zgłaszane jako bolesne? Chcę wiedzieć co wyrzucić z szablonów';

  it.each(['wzmocnienie paliczków dłoni', 'mostek na jednej nodze', 'rozciąganie barku z gumą', 'Alfredson'])(
    'a need or a name: %s',
    (text) => {
      expect(isExerciseTopic(text)).toBe(true);
    }
  );

  it.each([
    QUESTION,
    exerciseIdeaQuery(QUESTION),
    'czy mogę dać przysiad po rekonstrukcji',
    'które są najtrudniejsze',
    'jak często pacjenci przerywają',
    'ab',
  ])('a question or a sentence: %s', (text) => {
    expect(isExerciseTopic(text)).toBe(false);
  });

  it('gives no ideas card for a question about the catalog', () => {
    expect(withExerciseIdeas(QUESTION, { text: 'Nie widzę takich danych.' }).spec).toBeUndefined();
  });
});
