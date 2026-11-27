import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreatedExerciseSummary, rememberCreatedDescription } from '../CreatedExerciseSummary';

const catalog = vi.hoisted(() => ({ exercises: [] as Array<Record<string, unknown>>, loading: false }));
vi.mock('../../ChatSessionContext', () => ({ useChatActions: () => ({ organizationId: 'org-1' }) }));
vi.mock('../../useAvailableExercises', () => ({ useAvailableExercises: () => catalog }));

const EXERCISE = { id: 'ex-new', name: 'Koci grzbiet', type: 'reps', defaultSets: 2, defaultReps: 10 };

// 26.11 (Przemek): po utworzeniu ćwiczenia formularz znikał do „Ćwiczenie utworzone.”; ma zostać wynik jak przy wyszukaniu.
describe('CreatedExerciseSummary', () => {
  beforeEach(() => {
    catalog.exercises = [];
    catalog.loading = false;
  });

  it('pokazuje nowe ćwiczenie jak znalezione: nazwa, parametry, opis z formularza, gdy katalogu jeszcze go nie ma', () => {
    catalog.exercises = [EXERCISE];
    rememberCreatedDescription('ex-new', 'Na czworakach zaokrąglasz i prostujesz plecy.');

    render(<CreatedExerciseSummary exerciseId="ex-new" testId="created" />);

    const card = screen.getByTestId('created');
    expect(card.textContent).toContain('Koci grzbiet');
    expect(card.textContent).toContain('2 × 10');
    expect(card.textContent).toContain('Na czworakach zaokrąglasz i prostujesz plecy.');
    expect(screen.getByTestId('created-new')).toBeTruthy();
    expect(screen.getByTestId('created-open-link').getAttribute('href')).toBe('/exercises/ex-new');
  });

  it('opis z katalogu ma pierwszeństwo', () => {
    catalog.exercises = [{ ...EXERCISE, id: 'ex-cat', patientDescription: 'Opis z katalogu.' }];
    rememberCreatedDescription('ex-cat', 'Opis z formularza.');

    render(<CreatedExerciseSummary exerciseId="ex-cat" testId="created" />);

    expect(screen.getByTestId('created').textContent).toContain('Opis z katalogu.');
    expect(screen.getByTestId('created').textContent).not.toContain('Opis z formularza.');
  });

  it('bez ćwiczenia w katalogu po wczytaniu zostaje krótka informacja', () => {
    render(<CreatedExerciseSummary exerciseId="ex-gone" testId="created" />);

    expect(screen.getByTestId('created').textContent).toContain('Ćwiczenie utworzone.');
  });
});
