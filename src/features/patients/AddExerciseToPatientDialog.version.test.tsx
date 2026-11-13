import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddExerciseToPatientDialog } from './AddExerciseToPatientDialog';

const mockClientQuery = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
let listItems: Array<Record<string, unknown>> = [];

const apolloClient = { query: mockClientQuery };
const queryResult = (data: unknown) => ({ data, loading: false, error: undefined, refetch: vi.fn() });
// Lista idzie stronami (useExercisePickerPages): jedna strona, ta sama tablica `items` przy każdym renderze.
const pageOf = (items: Array<Record<string, unknown>>) => ({
  availableExercisesPage: {
    items,
    totalCount: items.length,
    page: 1,
    hasNextPage: false,
    counts: { all: items.length, organization: 0, fiziyo: items.length },
  },
});

vi.mock('@apollo/client/react', () => ({
  useQuery: () => queryResult(pageOf(listItems)),
  useMutation: () => [mockMutate, { loading: false }],
  useApolloClient: () => apolloClient,
}));
vi.mock('sonner', () => ({ toast: { error: mockToastError, success: vi.fn() } }));
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
    mockMutate.mockReset();
    mockMutate.mockResolvedValue({ data: {} });
    mockToastError.mockReset();
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

  it('dopóki treść się wczytuje, czas „naprzemiennie” i podpowiedź strony nie pokazują liczby', async () => {
    mockClientQuery.mockReturnValue(new Promise(() => {}));
    renderDialog();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));

    expect(timesText()).toBe('Czas serii (wyliczany)—Czas ćwiczenia (wyliczany)—');
    expect(screen.getByTestId('add-exercise-submit-btn')).toBeDisabled();
  });

  it('po błędzie wczytania treści nie zapisuje, ponawia z komunikatem, a po udanym ponowieniu zapisuje', async () => {
    mockClientQuery
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
      });
    renderDialog();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));

    // Po błędzie czas dalej nie jest liczbą z innej wersji, a przycisk jest aktywny, żeby dało się ponowić.
    await waitFor(() => expect(screen.getByTestId('add-exercise-submit-btn')).not.toBeDisabled());
    expect(timesText()).toBe('Czas serii (wyliczany)—Czas ćwiczenia (wyliczany)—');

    fireEvent.click(screen.getByTestId('add-exercise-submit-btn'));
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockMutate).not.toHaveBeenCalled();

    await waitFor(() => expect(timesText()).toBe('Czas serii (wyliczany)~1 minCzas ćwiczenia (wyliczany)~5 min'));
    fireEvent.click(screen.getByTestId('add-exercise-submit-btn'));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
  });

  it('rekord bez wersji po udanym wczytaniu nie jest blokowany (enrichmentData: null)', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: null } },
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('add-exercise-item-ex-alt'));
    await waitFor(() => expect(timesText()).toBe('Czas serii (wyliczany)~30 sCzas ćwiczenia (wyliczany)~4 min'));
    fireEvent.click(screen.getByTestId('add-exercise-submit-btn'));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
  });
});
