import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExerciseReviewLogAccess, ExerciseReviewNote } from '@/graphql/types/exerciseReviewNote.types';

import { ReviewNotesPanel } from './ReviewNotesPanel';

const apollo = vi.hoisted(() => ({
  addNote: vi.fn(),
  changeVisibility: vi.fn(),
  notes: [] as ExerciseReviewNote[],
  access: undefined as ExerciseReviewLogAccess | undefined,
  queried: [] as Array<{ name: string | undefined; options: Record<string, unknown> }>,
}));

type Doc = { definitions?: Array<{ name?: { value?: string } }> };
const docName = (doc: Doc) => doc?.definitions?.[0]?.name?.value;

vi.mock('@apollo/client/react', () => ({
  useQuery: (query: Doc, options: Record<string, unknown>) => {
    const name = docName(query);
    apollo.queried.push({ name, options });
    if (name === 'GetExerciseReviewNotes') return { data: { exerciseReviewNotes: apollo.notes }, loading: false };
    if (name === 'GetExerciseReviewLogAccess')
      return { data: { exerciseReviewLogAccess: apollo.access }, loading: false };
    return { data: undefined, loading: false };
  },
  useMutation: (mutation: Doc) => {
    const name = docName(mutation);
    if (name === 'AddExerciseReviewNote') return [apollo.addNote, { loading: false }];
    if (name === 'ChangeExerciseReviewNoteVisibility') return [apollo.changeVisibility, { loading: false }];
    return [vi.fn(), { loading: false }];
  },
}));

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

function note(id: string, overrides: Partial<ExerciseReviewNote> = {}): ExerciseReviewNote {
  return {
    id,
    exerciseId: 'ex-1',
    kind: 'NOTE',
    authorRole: 'REVIEWER',
    authorName: 'Ola',
    isMine: true,
    body: `Treść ${id}`,
    contextKey: 'material',
    contextLabel: 'Materiał',
    replyToNoteId: null,
    createdAt: '2026-11-24T10:00:00Z',
    visibility: 'ORG_REVIEWERS',
    isSentToAuthor: false,
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

function renderPanel(track: 'catalog' | 'organization' = 'organization') {
  return render(<ReviewNotesPanel exerciseId="ex-1" context={{ key: 'material', label: 'Materiał' }} track={track} />);
}

beforeEach(() => {
  apollo.addNote.mockResolvedValue({ data: {} });
  apollo.changeVisibility.mockResolvedValue({ data: {} });
  apollo.access = ORG_REVIEWER;
  apollo.notes = [];
  apollo.queried = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReviewNotesPanel – log pracy z ćwiczeniem', () => {
  it('is a log only: no review actions in the panel', () => {
    renderPanel();

    expect(screen.getByTestId('review-notes-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('review-notes-send-author-btn')).toBeNull();
    expect(screen.queryByTestId('review-notes-send-internal-btn')).toBeNull();
  });

  it('asks the backend for the organization track and never trusts a stale cache first', () => {
    renderPanel('organization');

    const notesQuery = apollo.queried.find((entry) => entry.name === 'GetExerciseReviewNotes');
    expect(notesQuery?.options).toMatchObject({
      variables: { exerciseId: 'ex-1', organizationTrack: true },
      fetchPolicy: 'network-only',
    });
  });

  it('shows notes, decisions and content changes on one timeline with a scope on every note', () => {
    apollo.notes = [
      note('a', { visibility: 'AUTHOR', isSentToAuthor: true }),
      note('sent', { kind: 'SENT_TO_AUTHOR', sentNoteCount: 1, body: '' }),
      note('change', { kind: 'CONTENT_CHANGED', changedFields: ['name', 'enrichmentData.patient.steps'], body: '' }),
    ];
    renderPanel();

    expect(within(screen.getByTestId('review-note-visibility-a')).getByText('Autor')).toBeInTheDocument();
    expect(screen.getByTestId('review-note-sent-a')).toHaveTextContent('wysłana');
    expect(screen.getByTestId('review-note-event-sent')).toHaveTextContent('Odesłano do autora · 1 uwaga');
    expect(screen.getByTestId('review-note-event-change')).toHaveTextContent('Zmieniono: nazwa, kroki');
  });

  it('filters the log to notes or events', async () => {
    apollo.notes = [note('a'), note('ok', { kind: 'APPROVED', body: '' })];
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('review-notes-filter-notes'));
    expect(screen.getByTestId('review-note-a')).toBeInTheDocument();
    expect(screen.queryByTestId('review-note-event-ok')).toBeNull();

    await user.click(screen.getByTestId('review-notes-filter-events'));
    expect(screen.queryByTestId('review-note-a')).toBeNull();
    expect(screen.getByTestId('review-note-event-ok')).toBeInTheDocument();
  });

  it('saves a note with the default scope and the chosen one', async () => {
    renderPanel();
    const user = userEvent.setup();

    expect(screen.getByTestId('review-notes-visibility-btn')).toHaveAttribute('data-visibility', 'ORG_REVIEWERS');
    await user.type(screen.getByTestId('review-notes-input'), 'Dla nas');
    await user.click(screen.getByTestId('review-notes-add-btn'));
    expect(apollo.addNote).toHaveBeenLastCalledWith({
      variables: expect.objectContaining({ body: 'Dla nas', visibility: 'ORG_REVIEWERS', organizationTrack: true }),
    });

    await user.click(screen.getByTestId('review-notes-visibility-btn'));
    await user.click(await screen.findByTestId('review-notes-visibility-option-AUTHOR'));
    await user.type(screen.getByTestId('review-notes-input'), 'Popraw zdjęcie B');
    await user.click(screen.getByTestId('review-notes-add-btn'));
    expect(apollo.addNote).toHaveBeenLastCalledWith({
      variables: expect.objectContaining({ body: 'Popraw zdjęcie B', visibility: 'AUTHOR' }),
    });
  });

  it('offers only narrower scopes, and only on notes the backend lets the viewer change', async () => {
    apollo.notes = [note('mine', { visibility: 'THERAPIST', canChangeVisibility: true }), note('other')];
    renderPanel();
    const user = userEvent.setup();

    expect(screen.getByTestId('review-note-visibility-other').tagName).toBe('SPAN');
    await user.click(screen.getByTestId('review-note-visibility-mine'));
    expect(await screen.findByTestId('review-note-narrow-mine-AUTHOR')).toBeInTheDocument();
    expect(screen.getByTestId('review-note-narrow-mine-ORG_REVIEWERS')).toBeInTheDocument();
    expect(screen.queryByTestId('review-note-narrow-mine-THERAPIST')).toBeNull();
    expect(screen.queryByTestId('review-note-narrow-mine-FIZIYO_ADMINS')).toBeNull();

    await user.click(screen.getByTestId('review-note-narrow-mine-AUTHOR'));
    expect(apollo.changeVisibility).toHaveBeenCalledWith({
      variables: { noteId: 'mine', visibility: 'AUTHOR', organizationTrack: true },
    });
  });

  it('counts notes for the author still waiting to be sent', () => {
    apollo.notes = [
      note('draft', { visibility: 'AUTHOR' }),
      note('sent', { visibility: 'AUTHOR', isSentToAuthor: true }),
    ];
    renderPanel();

    expect(screen.getByTestId('review-notes-unsent-count')).toHaveTextContent('Dla autora, do odesłania: 1');
  });

  it('has no composer for a viewer who may not write', () => {
    apollo.access = { level: 'THERAPIST', writableVisibilities: [], defaultVisibility: null, canSendToAuthor: false };
    renderPanel();

    expect(screen.queryByTestId('review-notes-input')).toBeNull();
  });
});
