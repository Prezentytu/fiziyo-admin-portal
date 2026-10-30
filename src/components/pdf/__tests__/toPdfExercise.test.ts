import { describe, expect, it, vi } from 'vitest';

vi.mock('../pdfImagePreloader', () => ({ preloadPdfImages: vi.fn() }));

import { toPdfExercise } from '../pdfExerciseUtils';
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
