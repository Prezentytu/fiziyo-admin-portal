import { describe, expect, it } from 'vitest';

import type { ExerciseReviewNote } from '@/graphql/types/exerciseReviewNote.types';

import { buildReviewThread, parseReviewAssigneeFilter, unsentReviewNotes } from '../reviewNotes';

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
    expect(parseReviewAssigneeFilter('available')).toBe('available');
    expect(parseReviewAssigneeFilter('ktos')).toBe('all');
    expect(parseReviewAssigneeFilter(null)).toBe('all');
  });
});
