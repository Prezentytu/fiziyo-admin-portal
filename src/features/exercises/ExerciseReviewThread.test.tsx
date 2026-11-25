import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExerciseReviewLogAccess, ExerciseReviewNote } from '@/graphql/types/exerciseReviewNote.types';

import { ExerciseReviewThread } from './ExerciseReviewThread';

const apollo = vi.hoisted(() => ({
  addNote: vi.fn(),
  notes: [] as ExerciseReviewNote[],
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: { exerciseReviewNotes: apollo.notes }, loading: false }),
  useMutation: () => [apollo.addNote, { loading: false }],
}));

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

function note(id: string, overrides: Partial<ExerciseReviewNote> = {}): ExerciseReviewNote {
  return {
    id,
    exerciseId: 'ex-1',
    kind: 'NOTE',
    authorRole: 'REVIEWER',
    authorName: 'Weryfikator',
    isMine: false,
    body: `Treść ${id}`,
    contextKey: null,
    contextLabel: null,
    replyToNoteId: null,
    createdAt: '2026-11-24T10:00:00Z',
    visibility: 'AUTHOR',
    isSentToAuthor: true,
    canChangeVisibility: false,
    changedFields: [],
    sentNoteCount: null,
    ...overrides,
  };
}

const ORG_REVIEWER: ExerciseReviewLogAccess = {
  level: 'ORG_REVIEWER',
  writableVisibilities: ['ORG_REVIEWERS', 'AUTHOR', 'THERAPIST'],
  defaultVisibility: 'ORG_REVIEWERS',
  canSendToAuthor: false,
};

beforeEach(() => {
  apollo.addNote.mockResolvedValue({ data: {} });
  apollo.notes = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ExerciseReviewThread – zgłoszenie ownera do katalogu', () => {
  it('shows only the catalog submission thread and lets the owner reply to it as the author', async () => {
    apollo.notes = [
      note('own', { visibility: 'ORG_REVIEWERS', isSentToAuthor: false, authorRole: 'REVIEWER' }),
      note('catalog', { exerciseId: 'ex-1-catalog' }),
      note('sent', { exerciseId: 'ex-1-catalog', kind: 'SENT_TO_AUTHOR', body: '' }),
    ];
    render(<ExerciseReviewThread exerciseId="ex-1" access={ORG_REVIEWER} catalogSubmissionOnly />);
    const user = userEvent.setup();

    expect(screen.queryByTestId('exercise-review-note-own')).toBeNull();
    await user.click(screen.getByTestId('exercise-review-note-catalog-reply-btn'));
    await user.type(screen.getByTestId('exercise-review-reply-input'), 'Poprawione');
    await user.click(screen.getByTestId('exercise-review-reply-send-btn'));

    // Odpowiedź na uwagę z kopii: backend zapisuje ją w wątku kopii jako odpowiedź autora.
    expect(apollo.addNote).toHaveBeenCalledWith({
      variables: { exerciseId: 'ex-1', body: 'Poprawione', replyToNoteId: 'catalog' },
    });
  });

  it("answers the reviewer's latest catalog note when the owner writes without picking one", async () => {
    apollo.notes = [
      note('first', { exerciseId: 'ex-1-catalog' }),
      note('latest', { exerciseId: 'ex-1-catalog' }),
      note('sent', { exerciseId: 'ex-1-catalog', kind: 'SENT_TO_AUTHOR', body: '' }),
      note('mine', { exerciseId: 'ex-1-catalog', authorRole: 'AUTHOR', isMine: true }),
    ];
    render(<ExerciseReviewThread exerciseId="ex-1" access={ORG_REVIEWER} catalogSubmissionOnly />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('exercise-review-reply-input'), 'Dodałem opis');
    await user.click(screen.getByTestId('exercise-review-reply-send-btn'));

    expect(apollo.addNote).toHaveBeenCalledWith({
      variables: { exerciseId: 'ex-1', body: 'Dodałem opis', replyToNoteId: 'latest' },
    });
  });

  it('offers no reply when the catalog thread has no reviewer note to answer', () => {
    apollo.notes = [
      note('mine', { exerciseId: 'ex-1-catalog', authorRole: 'AUTHOR', isMine: true }),
      note('sent', { exerciseId: 'ex-1-catalog', kind: 'SENT_TO_AUTHOR', body: '' }),
    ];
    render(<ExerciseReviewThread exerciseId="ex-1" access={ORG_REVIEWER} catalogSubmissionOnly />);

    expect(screen.queryByTestId('exercise-review-reply-input')).toBeNull();
  });

  it('renders nothing for an owner without a catalog submission thread', () => {
    apollo.notes = [note('own', { visibility: 'ORG_REVIEWERS', isSentToAuthor: false })];
    const { container } = render(
      <ExerciseReviewThread exerciseId="ex-1" access={ORG_REVIEWER} catalogSubmissionOnly />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('offers no reply before a round was sent back', () => {
    apollo.notes = [note('catalog', { exerciseId: 'ex-1-catalog' })];
    render(<ExerciseReviewThread exerciseId="ex-1" access={ORG_REVIEWER} catalogSubmissionOnly />);

    expect(screen.queryByTestId('exercise-review-reply-input')).toBeNull();
  });
});
