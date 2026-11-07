import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InternalNotesPanel } from './InternalNotesPanel';

const systemRole = vi.hoisted(() => ({ canReviewExercises: false }));
const apollo = vi.hoisted(() => ({
  updateNotes: vi.fn(),
  queryOptions: [] as Array<{ skip?: boolean }>,
  internalNotes: null as string | null,
  error: undefined as Error | undefined,
  missing: false,
}));

vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ canReviewExercises: systemRole.canReviewExercises }),
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { skip?: boolean }) => {
    apollo.queryOptions.push(options);
    return {
      data: options.skip
        ? undefined
        : { exerciseByIdForAdmin: apollo.missing ? null : { id: 'ex-1', internalNotes: apollo.internalNotes } },
      loading: false,
      error: apollo.error,
    };
  },
  useMutation: () => [apollo.updateNotes, { loading: false }],
}));

describe('InternalNotesPanel', () => {
  beforeEach(() => {
    apollo.updateNotes.mockResolvedValue({ data: { updateExerciseField: { id: 'ex-1', internalNotes: 'x' } } });
    apollo.queryOptions = [];
    apollo.internalNotes = 'Źródło: film z kanału X';
    apollo.error = undefined;
    apollo.missing = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing and never asks the API for a therapist', () => {
    systemRole.canReviewExercises = false;

    render(<InternalNotesPanel exerciseId="ex-1" />);

    expect(screen.queryByTestId('exercise-internal-notes-section')).toBeNull();
    expect(apollo.queryOptions.every((options) => options.skip)).toBe(true);
  });

  it('shows saved notes to the FiziYo team and saves the edit on blur', async () => {
    systemRole.canReviewExercises = true;
    const user = userEvent.setup();

    render(<InternalNotesPanel exerciseId="ex-1" />);
    const input = screen.getByTestId('exercise-internal-notes-input');
    expect(input).toHaveValue('Źródło: film z kanału X');

    await user.type(input, ', duplikat ex-42');
    await user.tab();

    expect(apollo.updateNotes).toHaveBeenCalledWith({
      variables: { exerciseId: 'ex-1', value: 'Źródło: film z kanału X, duplikat ex-42' },
    });
    expect(await screen.findByText('Zapisano')).toBeInTheDocument();
  });

  it('clears notes with null and skips saving unchanged text', async () => {
    systemRole.canReviewExercises = true;
    const user = userEvent.setup();

    render(<InternalNotesPanel exerciseId="ex-1" />);
    const input = screen.getByTestId('exercise-internal-notes-input');
    await user.click(input);
    await user.tab();
    expect(apollo.updateNotes).not.toHaveBeenCalled();

    await user.clear(input);
    await user.tab();

    expect(apollo.updateNotes).toHaveBeenCalledWith({ variables: { exerciseId: 'ex-1', value: null } });
  });

  it.each([
    ['query error', () => (apollo.error = new Error('network'))],
    ['exercise not returned', () => (apollo.missing = true)],
  ])('shows a load error instead of an editor on %s', (_label, arrange) => {
    systemRole.canReviewExercises = true;
    arrange();

    render(<InternalNotesPanel exerciseId="ex-1" />);

    expect(screen.getByText('Nie udało się wczytać notatek')).toBeInTheDocument();
    expect(screen.queryByTestId('exercise-internal-notes-input')).toBeNull();
    expect(apollo.updateNotes).not.toHaveBeenCalled();
  });

  it('caps the input at the backend limit', () => {
    systemRole.canReviewExercises = true;

    render(<InternalNotesPanel exerciseId="ex-1" />);

    expect(screen.getByTestId('exercise-internal-notes-input')).toHaveAttribute('maxLength', '4000');
  });
});
