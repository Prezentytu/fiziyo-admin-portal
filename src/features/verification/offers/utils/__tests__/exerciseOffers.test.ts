import { describe, expect, it } from 'vitest';

import type { ExerciseOffer } from '@/graphql/types/exerciseOffer.types';

import {
  countAdoptable,
  decisionCopy,
  exercisesLabel,
  runBatchAccept,
  toPendingOfferViews,
  validateDecisionNote,
} from '../exerciseOffers';

function offer(overrides: Partial<ExerciseOffer>): ExerciseOffer {
  return {
    id: 'offer-1',
    mode: 'adopt',
    status: 'pending',
    offeredAt: '2026-11-17T10:00:00Z',
    exercise: { id: 'fx-1', name: 'Rotacja barku', images: ['', 'https://cdn/a.jpg'] },
    ...overrides,
  };
}

describe('toPendingOfferViews', () => {
  it('keeps only pending offers, newest first', () => {
    const views = toPendingOfferViews([
      offer({ id: 'old', offeredAt: '2026-11-16T10:00:00Z' }),
      offer({ id: 'answered', status: 'accepted' }),
      offer({ id: 'new', offeredAt: '2026-11-17T12:00:00Z' }),
    ]);

    expect(views.map((view) => view.id)).toEqual(['new', 'old']);
  });

  it('treats an unknown mode as review so nothing is added to the library', () => {
    const [view] = toPendingOfferViews([offer({ mode: 'something-new' })]);

    expect(view.mode).toBe('review');
    expect(countAdoptable([view])).toBe(0);
  });

  it('picks the first non-empty image and falls back to the clinical description', () => {
    const [view] = toPendingOfferViews([
      offer({
        exercise: { id: 'fx-1', name: ' ', images: ['', 'https://cdn/a.jpg'], clinicalDescription: 'Opis kliniczny' },
      }),
    ]);

    expect(view.imageUrl).toBe('https://cdn/a.jpg');
    expect(view.description).toBe('Opis kliniczny');
    expect(view.exerciseName).toBe('Ćwiczenie bez nazwy');
  });

  it('handles missing data', () => {
    expect(toPendingOfferViews(undefined)).toEqual([]);
  });
});

describe('validateDecisionNote', () => {
  it('requires a note when sending back for changes', () => {
    expect(validateDecisionNote('REQUEST_CHANGES', '  ')).toEqual({ ok: false, error: 'Napisz, co poprawić.' });
    expect(validateDecisionNote('REQUEST_CHANGES', ' dodaj zdjęcie ')).toEqual({ ok: true, note: 'dodaj zdjęcie' });
  });

  it('sends null for an empty optional note', () => {
    expect(validateDecisionNote('ACCEPT', '')).toEqual({ ok: true, note: null });
    expect(validateDecisionNote('REJECT', ' ')).toEqual({ ok: true, note: null });
  });
});

describe('decisionCopy', () => {
  it('names the result of accepting by mode', () => {
    expect(decisionCopy('ACCEPT', 'adopt').confirmLabel).toBe('Dodaj');
    expect(decisionCopy('ACCEPT', 'review').confirmLabel).toBe('Zatwierdź');
    expect(decisionCopy('REQUEST_CHANGES', 'adopt').noteRequired).toBe(true);
  });
});

describe('runBatchAccept', () => {
  it('continues after a failure and counts both outcomes', async () => {
    const seen: string[] = [];
    const result = await runBatchAccept(['a', 'b', 'c'], async (offerId) => {
      seen.push(offerId);
      if (offerId === 'b') throw new Error('conflict');
    });

    expect(seen).toEqual(['a', 'b', 'c']);
    expect(result).toEqual({ accepted: 2, failed: 1 });
  });
});

describe('exercisesLabel', () => {
  it.each([
    [1, '1 ćwiczenie'],
    [2, '2 ćwiczenia'],
    [5, '5 ćwiczeń'],
    [12, '12 ćwiczeń'],
    [22, '22 ćwiczenia'],
    [25, '25 ćwiczeń'],
  ])('%i → %s', (count, label) => {
    expect(exercisesLabel(count)).toBe(label);
  });
});
