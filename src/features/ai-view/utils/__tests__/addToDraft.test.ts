import { describe, expect, it } from 'vitest';

import {
  addToDraftReply,
  createdChoice,
  createdExerciseId,
  draftRequest,
  draftWithExercise,
  exerciseCreatedReply,
  openSetDraft,
} from '../addToDraft';
import { draftReturnOf, type DraftItem } from '../setDraft';

const CATALOG = [
  { id: 'e-bridge', name: 'Mostek' },
  { id: 'e-bridge-one', name: 'Mostek na jednej nodze' },
  { id: 'e-clam', name: 'Clamshell' },
  { id: 'e-plank', name: 'Deska bokiem' },
];
const PATIENTS = [{ id: 'p-tomasz', name: 'Tomasz Nowak' }];
const DRAFT = {
  exerciseIds: ['e-clam'],
  patientId: 'p-tomasz',
  note: 'wzmocnienie biodra',
  doses: { 'e-clam': { sets: 4, reps: 12 } },
};

// Demo 18.11: przy otwartej propozycji zestawu nie było widać, jak dodać ćwiczenie; z czatu się nie dało.
describe('draftRequest', () => {
  it.each([
    ['dodaj ćwiczenie mostek', 'mostek'],
    ['Dodaj do zestawu: Deska bokiem', 'Deska bokiem'],
    ['dodaj mostek do zestawu', 'mostek'],
    ['dorzuć jeszcze clamshell', 'clamshell'],
    ['dodaj mostek na jednej nodze', 'mostek na jednej nodze'],
    ['dopisz do tego deskę bokiem.', 'deskę bokiem'],
  ])('reads „%s” as adding „%s”', (text, query) => {
    expect(draftRequest(text)).toEqual({ kind: 'add', query });
  });

  it('reads a new exercise for the set and a bare request', () => {
    expect(draftRequest('utwórz ćwiczenie: wykrok z rotacją')).toEqual({ kind: 'create', query: 'wykrok z rotacją' });
    expect(draftRequest('dodaj ćwiczenie')).toEqual({ kind: 'add', query: '' });
    expect(draftRequest('utwórz nowe ćwiczenie')).toEqual({ kind: 'create', query: '' });
  });

  it.each([
    'dodaj ćwiczenia na pośladki',
    'dodaj 2 ćwiczenia',
    'dodaj coś na rozciąganie',
    'dodaj pacjenta Jan Kowalski',
    'zamień mostek na deskę',
    'pokaż ćwiczenie mostek',
    'dodaj',
  ])('leaves „%s” to the dispatcher', (text) => {
    expect(draftRequest(text)).toBeNull();
  });
});

describe('openSetDraft', () => {
  const draftSpec = { component: 'SetDraft' as const, exerciseIds: ['e-clam'] };

  it('is the newest card when that card is a set proposal still open', () => {
    expect(
      openSetDraft([
        { id: 'm1', role: 'user', text: 'zestaw na biodro' },
        { id: 'm2', role: 'assistant', spec: draftSpec },
        { id: 'm3', role: 'user', text: 'co to clamshell?' },
        { id: 'm4', role: 'assistant', text: 'Odwodzenie w leżeniu bokiem.' },
      ])
    ).toEqual({ messageId: 'm2', spec: draftSpec });
  });

  it('is nothing once the proposal moved on or another card came after it', () => {
    expect(openSetDraft([{ id: 'm2', role: 'assistant', spec: draftSpec, chosen: 'next' }])).toBeNull();
    expect(
      openSetDraft([
        { id: 'm2', role: 'assistant', spec: draftSpec },
        { id: 'm3', role: 'assistant', spec: { component: 'PatientPeek', patientId: 'p1' } },
      ])
    ).toBeNull();
    expect(openSetDraft([])).toBeNull();
  });
});

describe('addToDraftReply', () => {
  it('adds the catalog exercise to the open proposal and keeps the rest as it was set', () => {
    expect(addToDraftReply('dodaj ćwiczenie deska bokiem', DRAFT, CATALOG, PATIENTS)).toEqual({
      closesDraft: true,
      reply: {
        text: 'Dodane do zestawu: Deska bokiem. Parametry pozostałych ćwiczeń zostają bez zmian.',
        spec: {
          component: 'SetDraft',
          patientId: 'p-tomasz',
          exerciseIds: ['e-clam', 'e-plank'],
          note: 'wzmocnienie biodra',
          doses: { 'e-clam': { sets: 4, reps: 12 } },
          addedExerciseId: 'e-plank',
        },
      },
    });
  });

  it('takes the exercise named exactly and says which similar ones are in the catalog', () => {
    const added = addToDraftReply('dodaj mostek', DRAFT, CATALOG, PATIENTS);

    expect(added?.reply.spec).toMatchObject({ component: 'SetDraft', exerciseIds: ['e-clam', 'e-bridge'] });
    expect(added?.reply.text).toContain('Mostek na jednej nodze');
  });

  it('matches an inflected name', () => {
    expect(addToDraftReply('dodaj deskę bokiem', DRAFT, CATALOG, PATIENTS)?.reply.spec).toMatchObject({
      exerciseIds: ['e-clam', 'e-plank'],
    });
  });

  it('opens a new exercise that returns to the proposal when the catalog has none', () => {
    expect(addToDraftReply('dodaj ćwiczenie wykrok z rotacją', DRAFT, CATALOG, PATIENTS)).toEqual({
      closesDraft: true,
      reply: {
        text: 'W katalogu nie ma ćwiczenia „wykrok z rotacją”. Sprawdź nazwę i kliknij „Generuj”. Gotowe ćwiczenie wróci do tej propozycji zestawu.',
        spec: { component: 'CreateExercise', name: 'wykrok z rotacją', addToSet: DRAFT },
      },
    });
    expect(addToDraftReply('utwórz ćwiczenie mostek z piłką', DRAFT, CATALOG, PATIENTS)?.reply.spec).toEqual({
      component: 'CreateExercise',
      name: 'mostek z piłką',
      addToSet: DRAFT,
    });
  });

  it('does not add an exercise twice and asks for a name when none was given', () => {
    const twice = addToDraftReply('dodaj clamshell', DRAFT, CATALOG, PATIENTS);
    expect(twice).toEqual({
      closesDraft: false,
      reply: { text: 'Clamshell jest już w tym zestawie.' },
    });
    expect(addToDraftReply('dodaj ćwiczenie', DRAFT, CATALOG, PATIENTS)?.closesDraft).toBe(false);
  });

  it('leaves a message that names a patient or is not about adding to the dispatcher', () => {
    expect(addToDraftReply('dodaj Tomaszowi mostek', DRAFT, CATALOG, PATIENTS)).toBeNull();
    expect(addToDraftReply('zamień clamshell na mostek', DRAFT, CATALOG, PATIENTS)).toBeNull();
    expect(addToDraftReply('dodaj serię do mostka', DRAFT, CATALOG, PATIENTS)).toBeNull();
    expect(addToDraftReply('dodaj Adam Lis adam@example.com', DRAFT, CATALOG, PATIENTS)).toBeNull();
  });
});

// Właściciel 18.11: fizjo, który poprawił przerwy i dopisał ćwiczenie, nie może ich stracić.
describe('everything the therapist set survives a return to the proposal', () => {
  const tuned: DraftItem = {
    exerciseId: 'e-clam',
    sets: 4,
    reps: 12,
    duration: 0,
    executionTime: 3,
    restSets: 45,
    restReps: 2,
    preparationTime: 10,
    side: 'left',
    tempo: '2-1-2',
    loadKg: 5,
    notes: 'bez bólu',
  };
  const live = draftReturnOf([tuned], { patientId: 'p-tomasz', note: 'biodro' });

  it('carries the whole rows next to the short doses older cards read', () => {
    expect(live).toEqual({
      exerciseIds: ['e-clam'],
      patientId: 'p-tomasz',
      note: 'biodro',
      doses: { 'e-clam': { sets: 4, reps: 12 } },
      items: [tuned],
    });
  });

  it('keeps the rows when an exercise is added from the chat', () => {
    expect(addToDraftReply('dodaj mostek', live, CATALOG, PATIENTS)?.reply.spec).toMatchObject({
      component: 'SetDraft',
      exerciseIds: ['e-clam', 'e-bridge'],
      items: [tuned],
    });
  });
});

// Właściciel 18.11: „pojawi się dodawanie ćwiczenia i cyk, pokazuje się ten zestaw z tym nowym ćwiczeniem”.
describe('exerciseCreatedReply', () => {
  it('shows the proposal with the new exercise at once when it was created for a set', () => {
    expect(exerciseCreatedReply({ id: 'e-new', name: 'Wykrok z rotacją' }, { addToSet: DRAFT })).toEqual({
      text: 'Ćwiczenie „Wykrok z rotacją” jest w katalogu gabinetu i w zestawie. Zdjęcie i szczegóły dodasz później w katalogu ćwiczeń.',
      spec: {
        component: 'SetDraft',
        patientId: 'p-tomasz',
        exerciseIds: ['e-clam', 'e-new'],
        note: 'wzmocnienie biodra',
        doses: { 'e-clam': { sets: 4, reps: 12 } },
        addedExerciseId: 'e-new',
      },
    });
  });

  it('stays the created-exercise card with its next steps when no set is waiting', () => {
    expect(exerciseCreatedReply({ id: 'e-new', name: 'Wykrok' }, { patientId: 'p1' })).toEqual({
      spec: { component: 'ExerciseCreated', exerciseId: 'e-new', name: 'Wykrok', patientId: 'p1' },
    });
  });
});

// Decyzja właściciela 18.11: dopisana pozycja ma plakietkę „nowe”, tylko ta z ostatniego kroku.
describe('draftWithExercise', () => {
  it('marks the exercise added in this step and moves the mark with the next one', () => {
    const first = draftWithExercise(DRAFT, 'e-bridge');
    expect(first.addedExerciseId).toBe('e-bridge');

    // Karta oddaje wątkowi swój stan bez znacznika (`draftReturnOf`), więc kolejny krok oznacza tylko nową pozycję.
    const live = draftReturnOf([], { note: first.note });
    expect('addedExerciseId' in live).toBe(false);
    expect(draftWithExercise({ ...live, exerciseIds: first.exerciseIds }, 'e-plank').addedExerciseId).toBe('e-plank');
  });
});

// 26.11 (Przemek): po utworzeniu ćwiczenia formularz znikał do „Ćwiczenie utworzone.”; karta trzyma id, żeby pokazać wynik.
describe('createdChoice / createdExerciseId', () => {
  it('keeps the created exercise id in the card choice', () => {
    expect(createdExerciseId(createdChoice('ex-42'))).toBe('ex-42');
  });

  it('has no id for threads stored before (plain „created”) and for other choices', () => {
    expect(createdExerciseId('created')).toBeUndefined();
    expect(createdExerciseId('created:')).toBeUndefined();
    expect(createdExerciseId(undefined)).toBeUndefined();
    expect(createdExerciseId('next')).toBeUndefined();
  });
});
