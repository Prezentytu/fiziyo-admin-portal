import { describe, expect, it } from 'vitest';

import { routeIntent, type IntentContext } from '../intentRouter';
import { UNSUPPORTED_SPEC } from '../viewSpec';

const CONTEXT: IntentContext = {
  patients: [
    { id: 'p-jan', name: 'Jan Kowalski' },
    { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
    { id: 'p-ewa-n', name: 'Ewa Nowicka' },
  ],
  sets: [
    { id: 's-knee', name: 'Kolano · faza 2', description: 'Po rekonstrukcji ACL' },
    { id: 's-back', name: 'Lędźwie · faza 1', description: 'Kręgosłup lędźwiowy' },
  ],
};

describe('routeIntent', () => {
  it('proposes a matching template set for a named patient', () => {
    expect(routeIntent('Zestaw dla Jana Kowalskiego na kolano', CONTEXT)).toEqual({
      component: 'SetDraft',
      patientId: 'p-jan',
      setId: 's-knee',
      exerciseIds: [],
    });
  });

  it('matches a set by its description and inflected topic', () => {
    const spec = routeIntent('przygotuj plan na kręgosłup lędźwiowy', CONTEXT);
    expect(spec).toMatchObject({ component: 'SetDraft', setId: 's-back' });
    expect(spec.component === 'SetDraft' && spec.patientId).toBeUndefined();
  });

  it('asks which patient when the name is ambiguous', () => {
    const spec = routeIntent('zestaw dla Ewy', CONTEXT);
    expect(spec).toMatchObject({ component: 'Clarify', options: ['Ewa Wiśniewska', 'Ewa Nowicka'] });
  });

  it('keeps the set request when the therapist answers which patient', () => {
    expect(routeIntent('Ewa Wiśniewska', CONTEXT, 'zestaw dla Ewy na kolano')).toEqual({
      component: 'SetDraft',
      patientId: 'p-ewa-w',
      setId: 's-knee',
      exerciseIds: [],
    });
    expect(routeIntent('Jan Kowalski na lędźwie', CONTEXT, 'Utwórz zestaw')).toMatchObject({
      component: 'SetDraft',
      patientId: 'p-jan',
      setId: 's-back',
    });
    expect(routeIntent('plan dla Jana na lędźwie', CONTEXT, 'zestaw dla Ewy na kolano')).toMatchObject({
      component: 'SetDraft',
      patientId: 'p-jan',
      setId: 's-back',
    });
    expect(routeIntent('kto nie ćwiczy', CONTEXT, 'Utwórz zestaw')).toEqual({
      component: 'PatientPeek',
      filter: 'inactive',
    });
  });

  it('asks for whom when a set request names no patient and no topic', () => {
    const spec = routeIntent('Utwórz zestaw', CONTEXT);
    expect(spec).toEqual({
      component: 'Clarify',
      question: expect.any(String),
      options: ['Bez pacjenta', 'Jan Kowalski', 'Ewa Wiśniewska', 'Ewa Nowicka'],
    });
  });

  it('composes a set without a patient when the therapist answers so', () => {
    expect(routeIntent('Bez pacjenta', CONTEXT, 'Utwórz zestaw')).toEqual({ component: 'SetDraft', exerciseIds: [] });
    expect(routeIntent('bez pacjenta', CONTEXT)).toEqual({ component: 'SetDraft', exerciseIds: [] });
  });

  it('opens the patient card when only the patient is named', () => {
    expect(routeIntent('zestaw dla Jana Kowalskiego', CONTEXT)).toEqual({
      component: 'PatientPeek',
      patientId: 'p-jan',
    });
  });

  it('falls back to exercise search when no set fits the topic', () => {
    expect(routeIntent('zestaw na skoliozę', CONTEXT)).toEqual({
      component: 'ExerciseResults',
      query: 'skolioze',
      exerciseIds: [],
      patientId: undefined,
    });
  });

  it('searches exercises', () => {
    expect(routeIntent('Znajdź ćwiczenia przy skoliozie', CONTEXT)).toMatchObject({
      component: 'ExerciseResults',
      query: 'skoliozie',
    });
  });

  it('shows inactive patients', () => {
    expect(routeIntent('Pokaż, kto nie ćwiczy', CONTEXT)).toEqual({ component: 'PatientPeek', filter: 'inactive' });
  });

  it('adds a patient in the thread and routes to closed navigation targets', () => {
    expect(routeIntent('Dodaj pacjenta', CONTEXT)).toEqual({ component: 'AddPatient', name: undefined });
    expect(routeIntent('Dodaj pacjentkę Anna Nowak, ból lędźwi', CONTEXT)).toEqual({
      component: 'AddPatient',
      name: 'Anna Nowak',
    });
    expect(routeIntent('przejdź do ustawień', CONTEXT)).toEqual({ component: 'Navigate', route: 'settings' });
  });

  it('creates an exercise in the thread', () => {
    expect(routeIntent('Utwórz ćwiczenie: mostek na jednej nodze', CONTEXT)).toEqual({
      component: 'CreateExercise',
      name: 'mostek na jednej nodze',
    });
    expect(routeIntent('dodaj nowe ćwiczenie', CONTEXT)).toEqual({ component: 'CreateExercise', name: undefined });
    expect(routeIntent('znajdź ćwiczenia na bark', CONTEXT).component).toBe('ExerciseResults');
  });

  it('says it cannot help with anything else', () => {
    expect(routeIntent('jaka jest pogoda', CONTEXT)).toEqual(UNSUPPORTED_SPEC);
    expect(routeIntent('   ', CONTEXT)).toEqual(UNSUPPORTED_SPEC);
  });

  it('navigates to sets when the message names only the screen', () => {
    expect(routeIntent('przejdź do zestawów', CONTEXT)).toEqual({ component: 'Navigate', route: 'exercise-sets' });
    expect(routeIntent('pokaż zestawy', CONTEXT)).toEqual({ component: 'Navigate', route: 'exercise-sets' });
    expect(routeIntent('pokaż zestaw na kolano', CONTEXT).component).not.toBe('Navigate');
  });

  it('suggests adding a patient when asked for a set with no patients', () => {
    expect(routeIntent('utwórz zestaw', { patients: [], sets: [] })).toEqual({
      component: 'Navigate',
      route: 'patient-new',
    });
  });
});
