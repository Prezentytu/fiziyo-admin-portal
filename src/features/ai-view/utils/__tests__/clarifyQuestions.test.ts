import { describe, expect, it } from 'vitest';

import {
  chosenClarifyAnswers,
  composeClarifyAnswers,
  composeRepickMessage,
  draftClarifyQuestions,
  exerciseClarifyQuestions,
  requestBefore,
} from '../clarifyQuestions';

const labels = (questions: ReadonlyArray<{ label: string }>) => questions.map((question) => question.label);

// Demo 18.11: pod zestawem „na wzmocnienie mięśni biodra” stał chip „Która strona i od kiedy?” i nikt nie wiedział, o co pyta.
describe('draftClarifyQuestions', () => {
  it('asks about the hip the request named, one thing per question', () => {
    const questions = labels(draftClarifyQuestions({ request: 'zestaw na wzmocnienie mięśni biodra' }));

    expect(questions[0]).toBe('Które biodro?');
    expect(questions).toContain('Czy przy ćwiczeniach pojawia się ból?');
    expect(questions).not.toContain('Od jak dawna trwają dolegliwości?');
    expect(questions.every((question) => !/ i od kiedy/.test(question))).toBe(true);
    expect(questions.length).toBeLessThanOrEqual(4);
  });

  it('names the leg for a thigh muscle and asks what the problem is when the request does not say', () => {
    expect(labels(draftClarifyQuestions({ request: 'zestaw na mięsień czworogłowy' })).slice(0, 3)).toEqual([
      'Która noga?',
      'Jaki jest główny problem?',
      'Skąd się wzięło?',
    ]);
  });

  it('does not ask about what the request or the note already says', () => {
    const questions = labels(
      draftClarifyQuestions({
        request: 'zestaw dla pani Anny, 62 lata, ból lewego kolana od 3 miesięcy po artroskopii',
        note: 'Kolano po artroskopii, faza 2',
      })
    );

    expect(questions.some((question) => /lewe|prawe|strony/.test(question))).toBe(false);
    expect(questions.some((question) => /Skąd/.test(question))).toBe(false);
    expect(questions.some((question) => /dawna/.test(question))).toBe(false);
    expect(questions.some((question) => /główny problem/.test(question))).toBe(false);
    expect(questions.some((question) => /lat/.test(question))).toBe(false);
    expect(questions).toContain('Jaki sprzęt jest pod ręką?');
  });

  it('asks how long it lasts once a complaint is named, and never about a side of the spine', () => {
    const questions = labels(draftClarifyQuestions({ note: 'Ból odcinka lędźwiowego' }));

    expect(questions).toContain('Od jak dawna trwają dolegliwości?');
    expect(questions.some((question) => /lew|praw|stron/.test(question))).toBe(false);
  });

  it('asks for the body area first when none is named', () => {
    expect(draftClarifyQuestions({ request: 'ułóż zestaw dla seniora' })[0].label).toBe(
      'Której okolicy ciała ma dotyczyć zestaw?'
    );
  });

  it('reads the area from an inflected word in the note when the request is a button label', () => {
    expect(draftClarifyQuestions({ request: 'Ułóż zestaw z 3', note: 'stabilizacja barków' })[0].label).toBe(
      'Który bark?'
    );
  });
});

describe('exerciseClarifyQuestions', () => {
  it('skips the goal and the equipment the query already names', () => {
    const questions = labels(exerciseClarifyQuestions('wzmacnianie pośladków z gumą'));

    expect(questions.some((question) => /cel/i.test(question))).toBe(false);
    expect(questions.some((question) => /sprzęt/.test(question))).toBe(false);
    expect(questions).toContain('Poziom zaawansowania pacjenta?');
  });

  it('asks full questions for a bare area', () => {
    expect(labels(exerciseClarifyQuestions('kolano'))).toEqual([
      'Jaki jest cel?',
      'Które kolano?',
      'Jaki sprzęt jest pod ręką?',
      'Poziom zaawansowania pacjenta?',
    ]);
  });
});

describe('requestBefore', () => {
  const messages = [
    { role: 'user' as const, text: 'zestaw na kolano dla Jana' },
    { role: 'assistant' as const, spec: { component: 'Sent' } },
    { role: 'user' as const, text: 'zestaw na wzmocnienie mięśni biodra' },
    { role: 'assistant' as const, spec: { component: 'SetDraft' } },
    { role: 'user' as const, text: 'Strona ciała: lewe' },
    { role: 'assistant' as const, spec: { component: 'SetDraft' } },
  ];

  it('joins what the therapist wrote since the last finished flow, so an answered question is not asked again', () => {
    const request = requestBefore(messages, 5);

    expect(request).toBe('zestaw na wzmocnienie mięśni biodra\nStrona ciała: lewe');
    expect(labels(draftClarifyQuestions({ request })).some((question) => /biodro/.test(question))).toBe(false);
  });

  it('is undefined before the first message', () => {
    expect(requestBefore(messages, 0)).toBeUndefined();
  });
});

// Decyzja właściciela 18.11: chip pokazuje pytanie z kontekstu, a klik wstawia krótki temat (mechanika z T-0036).
describe('question and topic pairs', () => {
  it('pairs every question with the short topic a tap puts in the message field', () => {
    expect(
      draftClarifyQuestions({ request: 'zestaw na ból biodra' }).map(({ label, topic }) => ({ label, topic }))
    ).toEqual([
      { label: 'Które biodro?', topic: 'Strona ciała' },
      { label: 'Skąd się wzięło?', topic: 'Przyczyna' },
      { label: 'Od jak dawna trwają dolegliwości?', topic: 'Czas trwania' },
      { label: 'Poziom zaawansowania pacjenta?', topic: 'Poziom zaawansowania' },
    ]);
    expect(draftClarifyQuestions({ request: 'zestaw na mięsień czworogłowy' })[1]).toMatchObject({
      label: 'Jaki jest główny problem?',
      topic: 'Główny objaw',
    });
    expect(exerciseClarifyQuestions('kolano').map((question) => question.topic)).toEqual([
      'Cel ćwiczeń',
      'Strona ciała',
      'Dostępny sprzęt',
      'Poziom zaawansowania',
    ]);
  });

  it.each([
    ['Strona ciała: prawa', 'Strona ciała'],
    ['Przyczyna: nie wiadomo', 'Przyczyna'],
    ['Czas trwania: pół roku', 'Czas trwania'],
    ['Poziom zaawansowania: raczej słaby', 'Poziom zaawansowania'],
  ])('takes „%s” for the answer, whatever its words', (answer, topic) => {
    const before = draftClarifyQuestions({ request: 'zestaw na ból biodra' }).map((question) => question.topic);
    const after = draftClarifyQuestions({ request: `zestaw na ból biodra\n${answer}` }).map(
      (question) => question.topic
    );

    expect(before).toContain(topic);
    expect(after).not.toContain(topic);
  });

  it('does not read the words of a topic as facts about the patient', () => {
    // „Ból przy ćwiczeniach: nie” to odpowiedź, nie zgłoszony ból: o czas trwania dolegliwości nadal nie pytamy.
    const topics = draftClarifyQuestions({
      request: 'zestaw na wzmocnienie mięśni biodra\nBól przy ćwiczeniach: nie',
    }).map((question) => question.topic);

    expect(topics).not.toContain('Ból przy ćwiczeniach');
    expect(topics).not.toContain('Czas trwania');
    expect(topics).toContain('Strona ciała');
  });

  it('works the same under exercise results', () => {
    const topics = exerciseClarifyQuestions('kolano', 'ćwiczenia na kolano\nDostępny sprzęt: brak').map(
      (question) => question.topic
    );
    expect(topics).not.toContain('Dostępny sprzęt');
    expect(topics).toContain('Ból i ograniczenia');
  });
});

// 25.11: odpowiedzi są do kliknięcia, a do wiadomości trafiają gotowe linie „Temat: odpowiedź”.
describe('ready answers', () => {
  it('gives every question its answers, the side matching the body part', () => {
    const questions = exerciseClarifyQuestions('kolano');

    expect(questions.every((question) => question.options.length >= 2)).toBe(true);
    expect(questions.find((question) => question.topic === 'Cel ćwiczeń')?.options).toEqual(
      expect.arrayContaining(['siła', 'rozciąganie', 'stabilizacja'])
    );
    expect(questions.find((question) => question.topic === 'Strona ciała')?.options).toEqual(['lewe', 'prawe', 'oba']);
    expect(exerciseClarifyQuestions('stopa').find((question) => question.topic === 'Strona ciała')?.options).toEqual([
      'lewa',
      'prawa',
      'obie',
    ]);
  });

  it('composes one line per answered question in question order and skips the rest', () => {
    const questions = exerciseClarifyQuestions('kolano');

    expect(
      composeClarifyAnswers(questions, {
        'Poziom zaawansowania': ['początkujący'],
        'Cel ćwiczeń': ['stabilizacja', 'siła'],
        'Dostępny sprzęt': [],
      })
    ).toBe('Cel ćwiczeń: siła, stabilizacja\nPoziom zaawansowania: początkujący');
  });

  it('does not ask again about what the composed answers settle', () => {
    const questions = exerciseClarifyQuestions('kolano');
    const answers = composeClarifyAnswers(questions, { 'Strona ciała': ['prawe'], 'Cel ćwiczeń': ['siła'] });

    const topics = exerciseClarifyQuestions('kolano', answers).map((question) => question.topic);
    expect(topics).not.toContain('Strona ciała');
    expect(topics).not.toContain('Cel ćwiczeń');
  });
});

describe('chosenClarifyAnswers', () => {
  it('lists the chosen answers in question and option order, skipping empty questions', () => {
    const questions = [
      { label: 'Cel?', topic: 'Cel ćwiczeń', options: ['siła', 'rozciąganie', 'stabilizacja'], multi: true },
      { label: 'Sprzęt?', topic: 'Dostępny sprzęt', options: ['taśma', 'piłka'] },
      { label: 'Strona?', topic: 'Strona ciała', options: ['lewe', 'prawe', 'oba'] },
    ];

    expect(
      chosenClarifyAnswers(questions, {
        'Strona ciała': ['prawe'],
        'Cel ćwiczeń': ['stabilizacja', 'siła'],
        'Dostępny sprzęt': [],
      })
    ).toEqual(['siła', 'stabilizacja', 'prawe']);
    expect(chosenClarifyAnswers(questions, {})).toEqual([]);
  });
});

// 26.11, DEV: same „Strona ciała: lewe / Przyczyna: po operacji” → asystent pytał „Która okolica?”, zamiast dobrać zestaw na kolano.
describe('composeRepickMessage', () => {
  const questions = [
    { label: 'Które kolano?', topic: 'Strona ciała', options: ['lewe', 'prawe', 'oba'] },
    { label: 'Skąd się wzięło?', topic: 'Przyczyna', options: ['po urazie', 'po operacji'] },
  ];

  it('sends the request with the chosen answers under it', () => {
    expect(composeRepickMessage('Ułóż zestaw na ból kolana', questions, { 'Strona ciała': ['lewe'] })).toBe(
      'Ułóż zestaw na ból kolana\nStrona ciała: lewe'
    );
  });

  it('replaces an earlier answer on the same topic and keeps the rest of the request', () => {
    expect(
      composeRepickMessage('Ułóż zestaw na ból kolana\nStrona ciała: prawe\nPrzyczyna: po urazie', questions, {
        'Strona ciała': ['lewe'],
      })
    ).toBe('Ułóż zestaw na ból kolana\nPrzyczyna: po urazie\nStrona ciała: lewe');
  });

  it('is empty without answers and works without a request', () => {
    expect(composeRepickMessage('Ułóż zestaw na ból kolana', questions, {})).toBe('');
    expect(composeRepickMessage(undefined, questions, { Przyczyna: ['po operacji'] })).toBe('Przyczyna: po operacji');
  });
});
