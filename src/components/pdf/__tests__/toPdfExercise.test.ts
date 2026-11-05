import { describe, expect, it, vi } from 'vitest';

vi.mock('../pdfImagePreloader', () => ({ preloadPdfImages: vi.fn() }));

import { toPdfExercise, toPdfExercises } from '../pdfExerciseUtils';
import { formatExecutionParameters } from '../pdfPageUtils';

function pdfParams(mapping: Parameters<typeof toPdfExercise>[0]) {
  const exercise = toPdfExercise(mapping);
  return formatExecutionParameters({ ...exercise });
}

describe('toPdfExercise + formatExecutionParameters (review #137, runda 3)', () => {
  it('TIME bez reps: serie × czas utrzymania, bez wymyślonych 10 powtórzeń', () => {
    const items = pdfParams({
      id: 'm-plank',
      exercise: { name: 'Deska', type: 'TIME', defaultSets: 3, defaultDuration: 30, defaultRestBetweenSets: 60 },
    });
    expect(items).toContainEqual({ label: 'Serie', value: '3' });
    expect(items.find((item) => item.label === 'Czas')).toBeDefined();
    expect(items.find((item) => item.label === 'Powtórzenia')).toBeUndefined();
  });

  it('TIME z jawnymi powtórzeniami pokazuje powtórzenia i czas', () => {
    const items = pdfParams({
      id: 'm-hold',
      reps: 2,
      exercise: { name: 'Utrzymanie', type: 'TIME', defaultSets: 3, defaultDuration: 30 },
    });
    expect(items).toContainEqual({ label: 'Powtórzenia', value: '2' });
    expect(items.find((item) => item.label === 'Czas')).toBeDefined();
  });

  it('REPS: powtórzenia z kanonem, bez pozostałego duration', () => {
    const items = pdfParams({
      id: 'm-reps',
      duration: 300,
      exercise: { name: 'Wspięcia', type: 'REPS', defaultSets: 3 },
    });
    expect(items).toContainEqual({ label: 'Serie', value: '3' });
    expect(items).toContainEqual({ label: 'Powtórzenia', value: '10' });
    expect(items.find((item) => item.label === 'Czas')).toBeUndefined();
  });
});

describe('toPdfExercises: personalizacja przypisania (exerciseOverrides)', () => {
  const mappings = [
    { id: 'm-1', order: 1, sets: 3, reps: 10, exercise: { name: 'Przysiad', type: 'REPS' } },
    { id: 'm-2', order: 2, sets: 2, reps: 8, exercise: { name: 'Wykrok', type: 'REPS' } },
  ];

  it('override przypisania wygrywa z mappingiem zestawu', () => {
    const [squat] = toPdfExercises(mappings, '{"m-1":{"sets":5,"reps":12,"customName":"Przysiad do krzesła"}}');
    expect(squat.sets).toBe(5);
    expect(squat.reps).toBe(12);
    expect(squat.customName).toBe('Przysiad do krzesła');
  });

  it('ćwiczenie ukryte dla pacjenta nie trafia na kartę', () => {
    const exercises = toPdfExercises(mappings, '{"m-2":{"hidden":true}}');
    expect(exercises.map((exercise) => exercise.id)).toEqual(['m-1']);
  });

  it('bez overrides zostają parametry mappingu', () => {
    const [squat] = toPdfExercises(mappings, null);
    expect(squat.sets).toBe(3);
    expect(squat.reps).toBe(10);
  });
});
