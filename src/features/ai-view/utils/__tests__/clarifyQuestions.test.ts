import { describe, expect, it } from 'vitest';

import { draftClarifyQuestions, exerciseClarifyQuestions, requestBefore } from '../clarifyQuestions';

// Demo 18.11: pod zestawem „na wzmocnienie mięśni biodra” stał chip „Która strona i od kiedy?” i nikt nie wiedział, o co pyta.
describe('draftClarifyQuestions', () => {
  it('asks about the hip the request named, one thing per question', () => {
    const questions = draftClarifyQuestions({ request: 'zestaw na wzmocnienie mięśni biodra' });

    expect(questions[0]).toBe('Które biodro: lewe, prawe czy oba?');
    expect(questions).toContain('Czy przy ćwiczeniach pojawia się ból?');
    expect(questions).not.toContain('Od jak dawna trwają dolegliwości?');
    expect(questions.every((question) => !/ i od kiedy/.test(question))).toBe(true);
    expect(questions.length).toBeLessThanOrEqual(4);
  });

  it('names the leg for a thigh muscle and asks what the problem is when the request does not say', () => {
    expect(draftClarifyQuestions({ request: 'zestaw na mięsień czworogłowy' }).slice(0, 3)).toEqual([
      'Która noga: lewa, prawa czy obie?',
      'Jaki jest główny problem: ból, sztywność czy osłabienie?',
      'Czy to po urazie, po operacji czy bez wyraźnej przyczyny?',
    ]);
  });

  it('does not ask about what the request or the note already says', () => {
    const questions = draftClarifyQuestions({
      request: 'zestaw dla pani Anny, 62 lata, ból lewego kolana od 3 miesięcy po artroskopii',
      note: 'Kolano po artroskopii, faza 2',
    });

    expect(questions.some((question) => /lewe|prawe|strony/.test(question))).toBe(false);
    expect(questions.some((question) => /urazie|operacji/.test(question))).toBe(false);
    expect(questions.some((question) => /dawna/.test(question))).toBe(false);
    expect(questions.some((question) => /główny problem/.test(question))).toBe(false);
    expect(questions.some((question) => /lat/.test(question))).toBe(false);
    expect(questions).toContain('Jaki sprzęt jest pod ręką?');
  });

  it('asks how long it lasts once a complaint is named, and never about a side of the spine', () => {
    const questions = draftClarifyQuestions({ note: 'Ból odcinka lędźwiowego' });

    expect(questions).toContain('Od jak dawna trwają dolegliwości?');
    expect(questions.some((question) => /lew|praw|stron/.test(question))).toBe(false);
  });

  it('asks for the body area first when none is named', () => {
    expect(draftClarifyQuestions({ request: 'ułóż zestaw dla seniora' })[0]).toBe(
      'Której okolicy ciała ma dotyczyć zestaw?'
    );
  });

  it('reads the area from an inflected word in the note when the request is a button label', () => {
    expect(draftClarifyQuestions({ request: 'Ułóż zestaw z 3', note: 'stabilizacja barków' })[0]).toBe(
      'Który bark: lewy, prawy czy oba?'
    );
  });
});

describe('exerciseClarifyQuestions', () => {
  it('skips the goal and the equipment the query already names', () => {
    const questions = exerciseClarifyQuestions('wzmacnianie pośladków z gumą');

    expect(questions.some((question) => /cel/i.test(question))).toBe(false);
    expect(questions.some((question) => /sprzęt/.test(question))).toBe(false);
    expect(questions).toContain('Jaki poziom zaawansowania pacjenta: początkujący, średni czy wysoki?');
  });

  it('asks full questions for a bare area', () => {
    expect(exerciseClarifyQuestions('kolano')).toEqual([
      'Jaki jest cel: siła, rozciąganie czy stabilizacja?',
      'Które kolano: lewe, prawe czy oba?',
      'Jaki sprzęt jest pod ręką?',
      'Jaki poziom zaawansowania pacjenta: początkujący, średni czy wysoki?',
    ]);
  });
});

describe('requestBefore', () => {
  const messages = [
    { role: 'user' as const, text: 'zestaw na kolano dla Jana' },
    { role: 'assistant' as const, spec: { component: 'Sent' } },
    { role: 'user' as const, text: 'zestaw na wzmocnienie mięśni biodra' },
    { role: 'assistant' as const, spec: { component: 'SetDraft' } },
    { role: 'user' as const, text: 'Które biodro: lewe, prawe czy oba? lewe' },
    { role: 'assistant' as const, spec: { component: 'SetDraft' } },
  ];

  it('joins what the therapist wrote since the last finished flow, so an answered question is not asked again', () => {
    const request = requestBefore(messages, 5);

    expect(request).toBe('zestaw na wzmocnienie mięśni biodra\nKtóre biodro: lewe, prawe czy oba? lewe');
    expect(draftClarifyQuestions({ request }).some((question) => /biodro/.test(question))).toBe(false);
  });

  it('is undefined before the first message', () => {
    expect(requestBefore(messages, 0)).toBeUndefined();
  });
});
