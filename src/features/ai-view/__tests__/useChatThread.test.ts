import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STOPPED_TEXT, useChatThread } from '../useChatThread';
import type { IntentContext } from '../utils/intentRouter';

const { dispatchMock } = vi.hoisted(() => ({ dispatchMock: vi.fn() }));

vi.mock('../chatDispatchClient', () => ({
  dispatchChatMessage: (...args: unknown[]) => dispatchMock(...args),
}));

const CONTEXT: IntentContext = { patients: [{ id: 'p1', name: 'Jan Kowalski' }], sets: [] };

describe('useChatThread', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue({
      sessionId: 'session-a',
      spec: { component: 'Navigate', route: 'patients' },
      creditsUsed: 1,
    });
  });

  it.each([false, true])('guides a missing mobile plan through to feedback with AI=%s', async (useAi) => {
    const { result } = renderHook(() => useChatThread({ useAi, context: CONTEXT, ready: true, scopeKey: 'org-a' }));
    for (const [message, topic] of [
      ['Pacjent nie widzi zestawu na telefonie. Co sprawdzić?', 'missing-plan'],
      ['Gabinet widzi', 'check-assignment'],
      ['Dalej pusto', 'report'],
    ]) {
      await act(() => result.current.send(message));
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'ProductHelp', topic },
        source: 'local',
        creditsUsed: 0,
      });
    }
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('continues discussing catalog matches and opens the form only on request', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'foot',
      creditsUsed: 1,
      spec: { component: 'ExerciseResults', exerciseIds: ['e1', 'e2'], query: 'stopa' },
    });
    await act(() => result.current.send('Jakie mamy ćwiczenia na stopę?'));
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { discussion: { ids: ['e1', 'e2'], search: 'stop' } },
    });
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'foot',
      creditsUsed: 1,
      text: 'Pierwsze wykonuje się w siadzie, drugie w staniu.',
    });
    await act(() => result.current.send('Czym się różnią?'));
    expect(result.current.messages.at(-1)).toMatchObject({
      text: 'Pierwsze wykonuje się w siadzie, drugie w staniu.',
      spec: { discussion: { ids: ['e1', 'e2'] } },
    });
    expect(dispatchMock.mock.calls[1][0]).toContain('Czym się różnią?');
    await act(() => result.current.send('Utwórz własne ćwiczenie'));
    expect(result.current.messages.at(-1)).toMatchObject({ spec: { component: 'CreateExercise' } });
    expect(result.current.messages.at(-1)).not.toHaveProperty('spec.discussion');
    expect(dispatchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the set request when the catalog choice gives only a link to exercises', async () => {
    const choice = 'Dobierz z katalogu na zdrowe plecy';
    dispatchMock.mockResolvedValueOnce({
      sessionId: 's',
      spec: { component: 'Clarify', question: 'Skąd mam wziąć ćwiczenia do zestawu?', options: [choice] },
      creditsUsed: 1,
    });
    dispatchMock.mockResolvedValueOnce({
      sessionId: 's',
      spec: { component: 'Navigate', route: 'exercises' },
      text: 'Nie znalazłem ćwiczeń. Podaj nazwy.',
      creditsUsed: 1,
    });
    const { result } = renderHook(() => useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org' }));
    await act(() =>
      result.current.send('Stworzymy zestaw bazujący na https://blog.fiziyo.pl/kurs/zdrowe-plecy-7-dni/')
    );
    await act(() => result.current.send(choice));
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: {
        component: 'ExerciseResults',
        query: 'zdrowe plecy',
        exerciseIds: [],
        forSet: { exerciseIds: [], note: 'zdrowe plecy' },
      },
    });
    await act(() => result.current.send('Tak, zróbmy ćwiczenie z asystentem'));
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'CreateExercise', addToSet: { note: 'zdrowe plecy' } },
    });
    expect(dispatchMock).toHaveBeenCalledTimes(2);
  });

  it('sends a full name that is not on the visible list to the server and shows its notice without a card', async () => {
    const text = 'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta.';
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      text,
      creditsUsed: 0,
      notice: 'patient_other_therapist',
    });
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('pokaż ćwiczenia na kolano dla Marii Zielińskiej'));

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock.mock.calls[0][0]).toBe('pokaż ćwiczenia na kolano dla Marii Zielińskiej');
    const reply = result.current.messages.at(-1);
    expect(reply).toMatchObject({ role: 'assistant', text, source: 'ai', notice: 'patient_other_therapist' });
    expect(reply).not.toHaveProperty('spec', expect.anything());
  });

  it('asks the server about an account question for a patient who is not on the visible list', async () => {
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      text: 'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta.',
      creditsUsed: 0,
      notice: 'patient_other_therapist',
    });
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('Czy Maria Zielińska odebrała zestaw?'));

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(result.current.messages.at(-1)).toMatchObject({ notice: 'patient_other_therapist' });
  });

  it('does not answer while chat data is loading', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: false, context: { patients: [], sets: [] }, ready: false, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('Utwórz zestaw'));

    expect(result.current.messages).toEqual([]);
  });

  it('answers a rules question in the context of the command that raised it', async () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
        { id: 'p-ewa-n', name: 'Ewa Nowicka' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };
    const { result } = renderHook(() => useChatThread({ useAi: false, context, ready: true, scopeKey: 'org-a' }));

    await act(() => result.current.send('zestaw dla Ewy na kolano'));
    expect(result.current.messages.at(-1)).toMatchObject({ spec: { component: 'Clarify' } });

    await act(() => result.current.send('nie wiem'));
    await act(() => result.current.send('Ewa Nowicka'));
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'SetDraft', patientId: 'p-ewa-n', setId: 's-knee' },
    });
  });

  it('finishes the command behind an AI question when the next dispatch falls back to rules', async () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
        { id: 'p-ewa-n', name: 'Ewa Nowicka' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      spec: { component: 'Clarify', question: 'O kogo chodzi?', options: ['Ewa Wiśniewska', 'Ewa Nowicka'] },
      creditsUsed: 0,
    });
    dispatchMock.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

    await act(() => result.current.send('zestaw dla Ewy na kolano'));
    await act(() => result.current.send('Ewa Nowicka'));

    expect(result.current.messages.at(-1)).toMatchObject({
      source: 'rules',
      spec: { component: 'SetDraft', patientId: 'p-ewa-n', setId: 's-knee' },
    });
  });

  // Demo 18.11: e-mail z pierwszej wiadomości ginął, gdy formularz przychodził dopiero po dopytaniu o imię.
  it('keeps the e-mail of the first message when the add-patient form comes after a question', async () => {
    dispatchMock.mockResolvedValueOnce({ sessionId: 'session-a', text: 'Na jaki problem?', creditsUsed: 1 });
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      spec: { component: 'AddPatient', name: 'Ala Nowak' },
      creditsUsed: 1,
    });
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('nowa osoba ala@example.com, zestaw na kolano'));
    await act(() => result.current.send('Ala Nowak'));

    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'AddPatient', name: 'Ala Nowak', email: 'ala@example.com' },
    });
  });

  it('opens the add-patient form at once, without the model', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('dodaj pacjenta ala@example.com'));

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'AddPatient', email: 'ala@example.com' },
    });
  });

  // Decyzja właściciela 18.11: aktywna jest jedna, najnowsza propozycja zestawu; do wcześniejszej da się wrócić.
  it('locks the earlier proposal when the model sends a newer one, and brings it back on request', async () => {
    const first = { component: 'SetDraft', exerciseIds: ['e1', 'e2'], note: 'biodro' };
    const second = { component: 'SetDraft', exerciseIds: ['e1', 'e3'], note: 'biodro' };
    dispatchMock.mockResolvedValueOnce({ sessionId: 'session-a', spec: first, creditsUsed: 1 });
    dispatchMock.mockResolvedValueOnce({ sessionId: 'session-a', spec: second, creditsUsed: 1 });
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('zestaw na biodro'));
    await act(() => result.current.send('zamień drugie ćwiczenie na coś lżejszego'));

    const cards = () => result.current.messages.filter((message) => message.role === 'assistant');
    expect(cards().map((message) => message.chosen)).toEqual(['superseded', undefined]);

    act(() => result.current.restoreDraft(first as never));

    expect(cards().map((message) => message.chosen)).toEqual(['superseded', 'superseded', undefined]);
    expect(cards().at(-1)).toMatchObject({ source: 'local', spec: first });
  });

  // Decyzja właściciela 18.11: po dodaniu pacjenta z prośby łączonej asystent sam przechodzi do reszty.
  it('goes on with the rest of a combined request for the patient just added', async () => {
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      text: 'Proponuję zestaw na biodro.',
      spec: { component: 'SetDraft', patientId: 'p-new', exerciseIds: ['e1', 'e2'] },
      creditsUsed: 1,
    });
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('dodaj pacjenta Adam Lis adam@example.com i ułóż mu zestaw na biodro'));
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'AddPatient', name: 'Adam Lis', then: 'ułóż mu zestaw na biodro' },
    });

    await act(() => result.current.continueForPatient('p-new', 'Adam Lis', 'ułóż mu zestaw na biodro'));

    expect(dispatchMock).toHaveBeenCalledWith(
      'ułóż mu zestaw na biodro. Pacjent: Adam Lis.',
      undefined,
      expect.anything()
    );
    expect(result.current.messages.at(-1)).toMatchObject({
      text: 'Dodano: Adam Lis. Proponuję zestaw na biodro.',
      spec: { component: 'SetDraft', patientId: 'p-new', exerciseIds: ['e1', 'e2'] },
    });
    expect(result.current.isBusy).toBe(false);
  });

  // Demo 18.11: przy otwartej propozycji zestawu „dodaj ćwiczenie” z czatu nie trafiało do tej propozycji.
  describe('an open set proposal', () => {
    const draft = { exerciseIds: ['e-clam'], note: 'biodro', doses: { 'e-clam': { sets: 4, reps: 12 } } };
    const getLiveDraft = () => ({ draft, catalog: [{ id: 'e-bridge', name: 'Mostek' }] });
    const modelDraft = {
      sessionId: 'session-a',
      spec: { component: 'SetDraft', exerciseIds: ['e-clam'], note: 'biodro' },
      creditsUsed: 1,
    };

    it('takes an exercise from the catalog with the parameters the card has now, without the model', async () => {
      dispatchMock.mockResolvedValueOnce(modelDraft);
      const { result } = renderHook(() =>
        useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a', getLiveDraft })
      );

      await act(() => result.current.send('zestaw na biodro'));
      await act(() => result.current.send('dodaj ćwiczenie mostek'));

      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(result.current.messages.at(-1)).toMatchObject({
        source: 'local',
        spec: { component: 'SetDraft', exerciseIds: ['e-clam', 'e-bridge'], doses: draft.doses, note: 'biodro' },
      });
      expect(result.current.messages.at(-3)).toMatchObject({ chosen: 'superseded' });
    });

    it('sends a new exercise the model proposes back to the proposal', async () => {
      dispatchMock.mockResolvedValueOnce(modelDraft);
      dispatchMock.mockResolvedValueOnce({
        sessionId: 'session-a',
        spec: { component: 'CreateExercise', name: 'Wykrok z rotacją' },
        creditsUsed: 1,
      });
      const { result } = renderHook(() =>
        useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a', getLiveDraft })
      );

      await act(() => result.current.send('zestaw na biodro'));
      await act(() => result.current.send('dodaj wykrok z rotacją'));

      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'CreateExercise', name: 'Wykrok z rotacją', addToSet: draft },
      });
    });

    it.each(['tak', 'nie'])('offers the open draft after saving and accepts a typed „%s”', async (answer) => {
      const { result } = renderHook(() =>
        useChatThread({ useAi: false, context: CONTEXT, ready: true, scopeKey: 'org-a', getLiveDraft })
      );
      act(() => result.current.appendAssistant({ spec: { component: 'SetDraft', ...draft } }));
      await act(() => result.current.send('Utwórz ćwiczenie na stopę'));
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'CreateExercise', name: 'Ćwiczenie na stopę', offerForSet: draft },
      });
      expect(result.current.messages.at(-1)).not.toHaveProperty('spec.addToSet');
      // The offer holds a copy of the proposal, so the proposal cannot be edited behind it.
      expect(result.current.messages.at(-3)).toMatchObject({ chosen: 'create-exercise' });
      act(() =>
        result.current.appendAssistant({
          spec: { component: 'ExerciseCreated', exerciseId: 'new', name: 'Test', addToSet: draft },
        })
      );
      await act(() => result.current.send(answer));
      const reply = result.current.messages.at(-1);
      if (answer === 'tak') {
        expect(reply).toMatchObject({
          spec: { component: 'SetDraft', exerciseIds: ['e-clam', 'new'], doses: draft.doses },
        });
      } else {
        expect(reply).toMatchObject({ role: 'assistant' });
        expect(reply?.role === 'assistant' && reply.spec).toBeUndefined();
      }
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('works the same without AI', async () => {
      const { result } = renderHook(() =>
        useChatThread({ useAi: false, context: CONTEXT, ready: true, scopeKey: 'org-a', getLiveDraft })
      );

      act(() => result.current.appendAssistant({ spec: { component: 'SetDraft', exerciseIds: ['e-clam'] } }));
      await act(() => result.current.send('dodaj do zestawu wykrok z rotacją'));

      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'CreateExercise', name: 'wykrok z rotacją', addToSet: draft },
      });
    });
  });

  // Test asystenta 17.11 (K3): dwóch „Jan Kowalski”, klik chipa wysyłał samą nazwę i wracało to samo pytanie.
  describe('namesakes', () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-jan-1', name: 'Jan Kowalski', contextLabel: 'Ból kolana' },
        { id: 'p-jan-2', name: 'Jan Kowalski', contextLabel: 'Rwa kulszowa' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };

    // SPEC-068 (K2): po wyborze chipa imiennika przy włączonym AI prośba wraca do AI z patientId,
    // żeby nie zgubić ograniczeń klinicznych ani pytania o aktywny plan/aktywność.
    it('a picked chip resumes the command through AI with patientId when AI is enabled', async () => {
      dispatchMock.mockResolvedValueOnce({
        sessionId: 'session-a',
        spec: {
          component: 'Clarify',
          question: 'Masz kilku pacjentów o tym imieniu. O kogo chodzi?',
          options: ['Jan Kowalski', 'Jan Kowalski'],
          choices: [
            { label: 'Jan Kowalski', patientId: 'p-jan-1' },
            { label: 'Jan Kowalski', patientId: 'p-jan-2' },
          ],
        },
        creditsUsed: 0,
      });
      dispatchMock.mockResolvedValueOnce({
        sessionId: 'session-a',
        text: 'Proponuję łagodny zestaw bez przysiadów (ok. 8 min).',
        spec: { component: 'SetDraft', patientId: 'p-jan-2', exerciseIds: ['e1', 'e2'] },
        creditsUsed: 1,
      });
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw dla Jana Kowalskiego na kolano bez przysiadów max 10 min'));
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { options: ['Jan Kowalski · Ból kolana', 'Jan Kowalski · Rwa kulszowa'] },
      });

      await act(() => result.current.choosePatient('p-jan-2', 'Jan Kowalski · Rwa kulszowa'));

      expect(dispatchMock).toHaveBeenCalledTimes(2);
      expect(dispatchMock).toHaveBeenLastCalledWith(
        'zestaw dla Jana Kowalskiego na kolano bez przysiadów max 10 min',
        'session-a',
        expect.any(AbortSignal),
        { patientId: 'p-jan-2' }
      );
      expect(result.current.messages.at(-2)).toMatchObject({ role: 'user', text: 'Jan Kowalski · Rwa kulszowa' });
      expect(result.current.messages.at(-1)).toMatchObject({
        source: 'ai',
        creditsUsed: 1,
        spec: { component: 'SetDraft', patientId: 'p-jan-2', exerciseIds: ['e1', 'e2'] },
      });
    });

    it('works the same without AI and does not carry the old question into the next message', async () => {
      const { result } = renderHook(() => useChatThread({ useAi: false, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('co u Jana Kowalskiego'));
      expect(result.current.messages.at(-1)).toMatchObject({ spec: { component: 'Clarify' } });
      await act(() => result.current.choosePatient('p-jan-1', 'Jan Kowalski · Ból kolana'));
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'PatientPeek', patientId: 'p-jan-1' },
      });

      await act(() => result.current.send('kto nie ćwiczy'));
      expect(result.current.messages.at(-1)).toMatchObject({ spec: { component: 'PatientPeek', filter: 'inactive' } });
    });
  });

  // Decyzja właściciela 18.11: jedno słowo (samo imię albo nazwisko) to za mało, żeby związać plan z pacjentem.
  describe('a patient named by one word', () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-tomasz', name: 'Tomasz Nowak', contextLabel: 'Ból kolana' },
        { id: 'p-ewa', name: 'Ewa Lis' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };
    const modelDraft = { component: 'SetDraft', patientId: 'p-tomasz', exerciseIds: ['e1', 'e2'] };
    const confirmQuestion = {
      component: 'Clarify',
      question: 'Czy chodzi o Tomasz Nowak (Ból kolana)?',
      options: ['Tak, Tomasz', 'Inny pacjent'],
      choices: [{ label: 'Tak, Tomasz', patientId: 'p-tomasz' }, { label: 'Inny pacjent' }],
    };
    const modelReply = { sessionId: 'session-a', text: 'Zestaw dla Tomasz Nowak.', spec: modelDraft, creditsUsed: 1 };

    it('a model card for a patient named by the first name alone waits for a confirmation', async () => {
      dispatchMock.mockResolvedValue(modelReply);
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw na kolano dla Tomasza'));
      expect(result.current.messages.at(-1)).toMatchObject({ text: confirmQuestion.question, spec: confirmQuestion });

      await act(() => result.current.choosePatient('p-tomasz', 'Tak, Tomasz'));
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(result.current.messages.at(-1)).toMatchObject({ text: 'Zestaw dla Tomasz Nowak.', spec: modelDraft });

      // Potwierdzony pacjent nie jest pytany drugi raz w tej rozmowie.
      await act(() => result.current.send('dodaj Tomaszowi mostek'));
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'ai', spec: modelDraft });
    });

    it('the full name needs no confirmation', async () => {
      dispatchMock.mockResolvedValue(modelReply);
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw na kolano dla Tomasza Nowaka'));

      expect(result.current.messages.at(-1)).toMatchObject({ source: 'ai', spec: modelDraft });
    });

    it('the patient on the header chip needs no confirmation', async () => {
      dispatchMock.mockResolvedValue(modelReply);
      const { result } = renderHook(() =>
        useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a', getContextPatientId: () => 'p-tomasz' })
      );

      await act(() => result.current.send('zestaw na kolano dla Tomasza'));

      expect(result.current.messages.at(-1)).toMatchObject({ source: 'ai', spec: modelDraft });
    });

    it('a typed „tak” continues the command without the model and without a second question', async () => {
      dispatchMock.mockResolvedValue(modelReply);
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw na kolano dla Tomasza'));
      await act(() => result.current.send('tak'));

      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(result.current.messages.at(-3)).toMatchObject({ spec: { component: 'Clarify' }, chosen: 'Tak, Tomasz' });
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'local', creditsUsed: 0, spec: modelDraft });
    });

    it('„Inny pacjent” opens the patient choice and the command goes on for the picked one', async () => {
      dispatchMock.mockResolvedValue(modelReply);
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw na kolano dla Tomasza'));
      await act(() => result.current.send('Inny pacjent'));
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'local', spec: { component: 'PickPatient' } });

      await act(() => result.current.choosePatient('p-ewa', 'Ewa Lis'));
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(result.current.messages.at(-1)).toMatchObject({
        text: 'Proponuję te ćwiczenia z katalogu dla: Ewa Lis. Zamień albo usuń, co nie pasuje.',
        spec: { ...modelDraft, patientId: 'p-ewa' },
      });
    });

    it('works the same from rules: the question once, then the command, also when the name is typed again', async () => {
      const { result } = renderHook(() => useChatThread({ useAi: false, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('zestaw na kolano dla Tomasza'));
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'rules', spec: confirmQuestion });

      await act(() => result.current.send('Tomasz'));
      expect(result.current.messages.at(-1)).toMatchObject({
        source: 'local',
        spec: { component: 'SetDraft', patientId: 'p-tomasz', setId: 's-knee' },
      });

      await act(() => result.current.send('plan Tomasza'));
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'PatientPeek', patientId: 'p-tomasz' },
      });
    });

    it('a first name typed after „Komu przypisać?” is confirmed before the schedule, with the draft kept', async () => {
      const draft = { name: 'Kolano · 18.11', items: [] };
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));
      act(() => result.current.appendAssistant({ text: 'Komu przypisać?', spec: { component: 'PickPatient', draft } }));

      await act(() => result.current.send('Tomaszowi'));
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'local', spec: confirmQuestion });

      await act(() => result.current.send('Tak, Tomasz'));
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.current.messages.at(-1)).toMatchObject({
        spec: { component: 'Schedule', draft: { ...draft, patientId: 'p-tomasz' } },
      });
    });
  });

  // Test asystenta 17.11 (K7, K5): odpowiedzi, które wątek zna sam, nie idą do modelu i nie kosztują kredytu.
  describe('answers without the model', () => {
    const draft = { name: 'Kolano · 17.11', patientId: 'p1', items: [] };

    it('a schedule typed after „Od kiedy i jak często?” goes to the send summary with the same patient', async () => {
      const { result } = renderHook(() =>
        useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
      );
      act(() =>
        result.current.appendAssistant({ text: 'Od kiedy i jak często?', spec: { component: 'Schedule', draft } })
      );

      await act(() => result.current.send('od dziś, 3 razy w tygodniu, 4 tygodnie'));

      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.current.messages.at(-1)).toMatchObject({
        source: 'local',
        creditsUsed: 0,
        spec: { component: 'SendSummary', draft, plan: { start: 'today', weeks: 4, rhythm: 'three' } },
      });
    });

    it('„czy odebrał zestaw?” is answered from the account state', async () => {
      const context: IntentContext = {
        patients: [{ id: 'p-halina', name: 'Halina Kowalczyk', isShadowUser: true }],
        sets: [],
      };
      const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

      await act(() => result.current.send('Czy Halina odebrała zestaw?'));
      expect(result.current.messages.at(-1)).toMatchObject({
        source: 'local',
        text: 'Czy chodzi o Halina Kowalczyk (bez konta)?',
        spec: { component: 'Clarify' },
      });
      await act(() => result.current.choosePatient('p-halina', 'Tak, Halina'));

      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.current.messages.at(-1)).toMatchObject({ source: 'local', creditsUsed: 0 });
      expect(result.current.messages.at(-1)?.text).toContain('nie ma jeszcze konta');

      // Pacjent rozmowy: drugie pytanie po samym imieniu już bez potwierdzania.
      await act(() => result.current.send('Czy Halina ma już konto?'));
      expect(result.current.messages.at(-1)?.text).toContain('nie ma jeszcze konta');
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  it('sends one message when the composer fires twice before the busy state renders', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => Promise.all([result.current.send('Pokaż pacjentów'), result.current.send('Pokaż pacjentów')]));

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(result.current.messages.filter((message) => message.role === 'user')).toHaveLength(1);
  });

  it('runs one task when a file is picked twice and reports whether it succeeded', async () => {
    const task = vi.fn().mockResolvedValue({ text: 'Gotowe.' });
    const { result } = renderHook(() =>
      useChatThread({ useAi: false, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let outcomes: boolean[] = [];
    await act(async () => {
      outcomes = await Promise.all([
        result.current.runTask('Dokument', task),
        result.current.runTask('Dokument', task),
      ]);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([true, false]);

    let failed = true;
    await act(async () => {
      failed = await result.current.runTask('Dokument', () => Promise.reject(new Error('Za duży.')));
    });
    expect(failed).toBe(false);
  });

  it('starts a new conversation and AI session when the organization changes', async () => {
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey }),
      { initialProps: { scopeKey: 'org-a' } }
    );

    await act(() => result.current.send('zestaw dla Kowalskiego'));
    expect(result.current.messages).toHaveLength(2);

    rerender({ scopeKey: 'org-b' });
    expect(result.current.messages).toEqual([]);

    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
  });

  it('drops a reply that arrives after the organization changed', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey }),
      { initialProps: { scopeKey: 'org-a' } }
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    rerender({ scopeKey: 'org-b' });
    expect((dispatchMock.mock.calls[0][2] as AbortSignal).aborted).toBe(true);
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isBusy).toBe(false);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
  });

  it('drops a reply that arrives after a new conversation was started', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    act(() => result.current.reset());
    expect((dispatchMock.mock.calls[0][2] as AbortSignal).aborted).toBe(true);
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isBusy).toBe(false);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
  });

  it('stops a reply in flight: the request is aborted, the question stays and the next turn starts a new AI session', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );
    await act(() => result.current.send('kto nie ćwiczy'));
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    const signal = dispatchMock.mock.lastCall?.[2] as AbortSignal;
    expect(dispatchMock).toHaveBeenLastCalledWith('zestaw dla Kowalskiego', 'session-a', expect.any(AbortSignal));
    act(() => result.current.stop());
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.isBusy).toBe(false);
    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[2]).toMatchObject({ role: 'user', text: 'zestaw dla Kowalskiego' });
    expect(result.current.messages[3]).toMatchObject({ role: 'assistant', text: STOPPED_TEXT, spec: undefined });
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
    expect(result.current.messages).toHaveLength(6);
  });

  it('stops a document task: its request is aborted, no card lands and the next send works', async () => {
    let resolveTask: (value: { text: string }) => void = () => undefined;
    let taskSignal: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.runTask('Przeanalizuj dokument', (signal) => {
        taskSignal = signal;
        return new Promise((resolve) => (resolveTask = resolve));
      });
    });
    act(() => result.current.stop());
    expect(taskSignal?.aborted).toBe(true);
    let landed = true;
    await act(async () => {
      resolveTask({ text: 'Znalazłem 3 ćwiczenia.' });
      landed = await pending;
    });

    expect(landed).toBe(false);
    expect(result.current.messages.map((message) => message.text)).toEqual(['Przeanalizuj dokument', STOPPED_TEXT]);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(result.current.messages).toHaveLength(4);
  });
});
