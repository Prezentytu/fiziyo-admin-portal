import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddExerciseToPatientDialog } from './AddExerciseToPatientDialog';

const mockClientQuery = vi.hoisted(() => vi.fn());
let listItems: Array<Record<string, unknown>> = [];

const apolloClient = { query: mockClientQuery };
const queryResult = (data: unknown) => ({ data, loading: false, error: undefined, refetch: vi.fn() });

vi.mock('@apollo/client/react', () => ({
  useQuery: () => queryResult({ availableExercises: listItems }),
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => apolloClient,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

/**
 * Picker daje listę BEZ treści; wersja rekordu dochodzi dopiero z treści wybranego ćwiczenia. Bez niej dialog
 * dodania pacjentowi liczył „naprzemiennie” łącznie także dla rekordu 3.3 (odbiór #234, B1).
 */
const alternatingExercise = { id: 'ex-alt', name: 'Wykrok', type: 'REPS', side: 'ALTERNATING', sets: 3, reps: 10, updatedAt: 't1' };

const assignment = {
  id: 'assignment-1',
  exerciseSetId: 'set-1',
  exerciseSet: { id: 'set-1', exerciseMappings: [] },
} as never;

const renderDialog = () =>
  render(
    <AddExerciseToPatientDialog
      open
      onOpenChange={() => {}}
      assignment={assignment}
      patientId="patient-1"
      organizationId="org-1"
    />
  );

const timesText = () =>
  screen.getByTestId('add-exercise-to-patient-dialog').textContent?.match(/Czas serii[^C]*Czas ćwiczenia[^C]*/)?.[0];

describe('AddExerciseToPatientDialog: wersja rekordu wybranego ćwiczenia', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    listItems = [alternatingExercise];
  });

  it('rekord 3.3: po dociągnięciu treści czas liczony na stronę, zapis czeka na treść', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));

    expect(screen.getByTestId('add-exercise-submit-btn')).toBeDisabled();
    await waitFor(() => expect(screen.getByTestId('add-exercise-submit-btn')).not.toBeDisabled());
    expect(mockClientQuery).toHaveBeenCalledTimes(1);
    // 10 powtórzeń domyślnie, 3 s na powtórzenie (szacunek): 3.3 liczy 20 ruchów w serii, rekord bez wersji 10.
    expect(timesText()).toBe('Czas serii (wyliczany)~1 minCzas ćwiczenia (wyliczany)~5 min');
  });

  it('rekord bez wersji: treść dociągnięta, czas łącznie jak dotąd', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));

    await waitFor(() => expect(screen.getByTestId('add-exercise-submit-btn')).not.toBeDisabled());
    expect(timesText()).toBe('Czas serii (wyliczany)~30 sCzas ćwiczenia (wyliczany)~4 min');
  });

  it('treść wczytuje się tylko dla wybranego ćwiczenia, nie dla całej listy', async () => {
    listItems = [alternatingExercise, { ...alternatingExercise, id: 'ex-other', name: 'Inne' }];
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    renderDialog();
    expect(mockClientQuery).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));
    await waitFor(() => expect(mockClientQuery).toHaveBeenCalledTimes(1));
    expect(mockClientQuery.mock.calls[0][0].variables).toEqual({ id: 'ex-alt' });
  });
});
