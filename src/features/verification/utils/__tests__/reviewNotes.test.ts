import { describe, expect, it } from 'vitest';

import type { ExerciseReviewNote } from '@/graphql/types/exerciseReviewNote.types';

import {
  buildReviewThread,
  changedFieldLabels,
  filterReviewLog,
  narrowerVisibilities,
  parseReviewAssigneeFilter,
  reviewEventText,
  unsentAuthorNotes,
  unsentReviewNotes,
} from '../reviewNotes';

function note(id: string, overrides: Partial<ExerciseReviewNote> = {}): ExerciseReviewNote {
  return {
    id,
    exerciseId: 'ex',
    kind: 'NOTE',
    authorRole: 'REVIEWER',
    authorName: 'Weryfikator',
    isMine: true,
    body: id,
    contextKey: null,
    contextLabel: null,
    replyToNoteId: null,
    createdAt: '2026-11-20T10:00:00Z',
    visibility: 'FIZIYO_ADMINS',
    isSentToAuthor: false,
    canChangeVisibility: false,
    changedFields: [],
    sentNoteCount: null,
    ...overrides,
  };
}

describe('unsentReviewNotes', () => {
  it('zwraca tylko uwagi weryfikatora pod ostatnią linią odcięcia', () => {
    const thread = [
      note('a'),
      note('sent', { kind: 'SENT_TO_INTERNAL_FIXES' }),
      note('ai', { authorRole: 'ASSISTANT', replyToNoteId: 'a' }),
      note('b'),
      note('c'),
    ];

    expect(unsentReviewNotes(thread).map((entry) => entry.id)).toEqual(['b', 'c']);
  });

  it('po wysłaniu nie zostaje nic do wysłania', () => {
    expect(unsentReviewNotes([note('a'), note('sent', { kind: 'SENT_TO_AUTHOR' })])).toEqual([]);
  });

  it('decyzja i zmiana treści nie tną rundy', () => {
    const thread = [note('a'), note('changed', { kind: 'CONTENT_CHANGED' }), note('ok', { kind: 'APPROVED' })];

    expect(unsentReviewNotes(thread).map((entry) => entry.id)).toEqual(['a']);
  });
});

describe('unsentAuthorNotes', () => {
  it('bierze tylko niewysłane uwagi weryfikatora z zakresem AUTHOR', () => {
    const thread = [
      note('team'),
      note('sent', { visibility: 'AUTHOR', isSentToAuthor: true }),
      note('draft', { visibility: 'AUTHOR' }),
      note('reply', { visibility: 'AUTHOR', authorRole: 'AUTHOR' }),
      note('therapist', { visibility: 'THERAPIST' }),
    ];

    expect(unsentAuthorNotes(thread).map((entry) => entry.id)).toEqual(['draft']);
  });
});

describe('narrowerVisibilities', () => {
  it('daje tylko węższe zakresy, które pytający może nadać', () => {
    expect(narrowerVisibilities('THERAPIST', ['ORG_REVIEWERS', 'AUTHOR', 'THERAPIST'])).toEqual([
      'ORG_REVIEWERS',
      'AUTHOR',
    ]);
    expect(narrowerVisibilities('ORG_REVIEWERS', ['ORG_REVIEWERS', 'AUTHOR'])).toEqual([]);
  });
});

describe('zdarzenia logu', () => {
  it('nazywa zmienione pola po polsku bez powtórzeń', () => {
    expect(
      changedFieldLabels([
        'name',
        'enrichmentData.patient.steps',
        'videoUrl',
        'videos',
        'enrichmentData.therapist.notes',
      ])
    ).toEqual(['nazwa', 'kroki', 'wideo', 'treść dla fizjoterapeuty']);
  });

  it('opisuje zmianę treści i odesłanie z liczbą uwag', () => {
    expect(reviewEventText(note('c', { kind: 'CONTENT_CHANGED', changedFields: ['name', 'media'] }))).toBe(
      'Zmieniono: nazwa, zdjęcia'
    );
    expect(reviewEventText(note('s', { kind: 'SENT_TO_AUTHOR', sentNoteCount: 2 }))).toBe(
      'Odesłano do autora · 2 uwagi'
    );
    expect(reviewEventText(note('s5', { kind: 'SENT_TO_AUTHOR', sentNoteCount: 5 }))).toBe(
      'Odesłano do autora · 5 uwag'
    );
  });

  it('filtruje log na uwagi albo zdarzenia', () => {
    const thread = [note('a'), note('ok', { kind: 'APPROVED' })];

    expect(filterReviewLog(thread, 'notes').map((entry) => entry.id)).toEqual(['a']);
    expect(filterReviewLog(thread, 'events').map((entry) => entry.id)).toEqual(['ok']);
    expect(filterReviewLog(thread, 'all')).toHaveLength(2);
  });
});

describe('buildReviewThread', () => {
  it('stawia odpowiedź pod uwagą, a linię odcięcia zostawia w kolejności', () => {
    const thread = [
      note('a'),
      note('b'),
      note('sent', { kind: 'SENT_TO_AUTHOR' }),
      note('reply-b', { authorRole: 'AUTHOR', replyToNoteId: 'b' }),
    ];

    const entries = buildReviewThread(thread);

    expect(entries.map((entry) => entry.note.id)).toEqual(['a', 'b', 'sent']);
    expect(entries[1].replies.map((reply) => reply.id)).toEqual(['reply-b']);
  });

  it('odpowiedź na niewidoczną uwagę pokazuje luzem', () => {
    const entries = buildReviewThread([note('reply', { authorRole: 'AUTHOR', replyToNoteId: 'hidden' })]);

    expect(entries.map((entry) => entry.note.id)).toEqual(['reply']);
  });
});

describe('parseReviewAssigneeFilter', () => {
  it('nieznana wartość oznacza wszystkie', () => {
    expect(parseReviewAssigneeFilter('mine')).toBe('mine');
    expect(parseReviewAssigneeFilter('unassigned')).toBe('unassigned');
    expect(parseReviewAssigneeFilter('ktos')).toBe('all');
    expect(parseReviewAssigneeFilter(null)).toBe('all');
  });
});
