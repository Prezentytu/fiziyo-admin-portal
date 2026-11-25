import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_EXERCISE_SET_LOG_QUERY } from '@/graphql/queries/exerciseSetLog.queries';
import { ADD_EXERCISE_SET_NOTE_MUTATION } from '@/graphql/mutations/exerciseSetLog.mutations';
import type { ExerciseSetLogEntry } from '@/graphql/types/exerciseSetLog.types';

import { SetHistoryNotesPanel } from './SetHistoryNotesPanel';

const systemRole = { canReviewExercises: false, isLoading: false };
vi.mock('@/hooks/useSystemRole', () => ({ useSystemRole: () => systemRole }));

const SET = 'set-1';
const names = new Map([['ex-1', 'Most biodrowy']]);

function entry(overrides: Partial<ExerciseSetLogEntry>): ExerciseSetLogEntry & { __typename: string } {
  return {
    __typename: 'ExerciseSetLogEntryView',
    id: 'e-1',
    exerciseSetId: SET,
    kind: 'NOTE',
    authorRole: 'THERAPIST',
    authorName: 'Anna',
    isMine: false,
    source: null,
    body: 'Notatka',
    data: null,
    visibility: 'ORGANIZATION',
    createdAt: '2026-11-24T10:00:00Z',
    updatedAt: null,
    ...overrides,
  };
}

function logMock(entries: ReturnType<typeof entry>[], maxUsageCount = 1): MockLink.MockedResponse {
  return {
    request: { query: GET_EXERCISE_SET_LOG_QUERY, variables: { exerciseSetId: SET } },
    result: { data: { exerciseSetLog: entries } },
    maxUsageCount,
  };
}

function renderPanel(mocks: MockLink.MockedResponse[], isGlobalTemplate = false) {
  return render(
    <MockedProvider mocks={mocks}>
      <SetHistoryNotesPanel exerciseSetId={SET} isGlobalTemplate={isGlobalTemplate} exerciseNames={names} />
    </MockedProvider>
  );
}

describe('SetHistoryNotesPanel', () => {
  beforeEach(() => {
    systemRole.canReviewExercises = false;
  });

  it('chowa się, gdy backend nie zna logu (API sprzed fizjo-app#741)', async () => {
    const { container } = renderPanel([
      {
        request: { query: GET_EXERCISE_SET_LOG_QUERY, variables: { exerciseSetId: SET } },
        result: { errors: [new GraphQLError('The field `exerciseSetLog` does not exist on the type `Query`.')] },
      },
    ]);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('pokazuje zdarzenie ze szczegółami po nazwie ćwiczenia, a edycję tylko przy własnej notatce', async () => {
    renderPanel([
      logMock([
        entry({ id: 'n-cudza', body: 'Cudza notatka' }),
        entry({ id: 'n-moja', body: 'Moja notatka', isMine: true, visibility: 'PRIVATE', createdAt: '2026-11-24T11:00:00Z' }),
        entry({
          id: 'ev-1',
          kind: 'CONTENT_CHANGED',
          authorRole: 'SYSTEM',
          authorName: 'FiziYo',
          body: 'Zmiany: zmienione pozycje: 1',
          data: JSON.stringify({ items: { 'm-1': { exerciseId: 'ex-1', fields: { reps: { before: 10, after: 12 } } } } }),
          createdAt: '2026-11-24T12:00:00Z',
        }),
      ]),
    ]);

    expect(await screen.findByText('Zmiany: zmienione pozycje: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('set-log-entry-ev-1-details-btn'));
    expect(screen.getByText('Most biodrowy: powtórzenia: 10 → 12')).toBeInTheDocument();

    expect(screen.getByTestId('set-log-entry-n-moja-edit-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('set-log-entry-n-cudza-edit-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('set-log-entry-n-moja-visibility')).toHaveTextContent('Tylko ja');
    expect(screen.getByText('Pacjent tego nie widzi.')).toBeInTheDocument();
  });

  it('personel wybiera gabinet albo prywatnie i wysyła wybrany zakres', async () => {
    const added = entry({ id: 'n-new', body: 'Zmniejszyłam dawki', isMine: true, visibility: 'PRIVATE' });
    renderPanel([
      logMock([]),
      {
        request: {
          query: ADD_EXERCISE_SET_NOTE_MUTATION,
          variables: { exerciseSetId: SET, body: 'Zmniejszyłam dawki', visibility: 'PRIVATE' },
        },
        result: { data: { addExerciseSetNote: added } },
      },
      logMock([added]),
    ]);

    const picker = await screen.findByTestId('set-history-notes-visibility');
    expect(within(picker).getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['Gabinet', 'Tylko ja']);

    fireEvent.click(screen.getByTestId('set-history-notes-visibility-PRIVATE-btn'));
    fireEvent.change(screen.getByTestId('set-history-notes-input'), { target: { value: '  Zmniejszyłam dawki ' } });
    fireEvent.click(screen.getByTestId('set-history-notes-add-btn'));

    expect(await screen.findByText('Zmniejszyłam dawki')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('set-history-notes-input')).toHaveValue(''));
  });

  it('zespół FiziYo na szablonie FiziYo może pisać dla wszystkich fizjo', async () => {
    systemRole.canReviewExercises = true;
    renderPanel([logMock([])], true);
    const picker = await screen.findByTestId('set-history-notes-visibility');
    expect(within(picker).getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'Zespół FiziYo',
      'Wszyscy fizjo',
      'Tylko ja',
    ]);
  });
});
