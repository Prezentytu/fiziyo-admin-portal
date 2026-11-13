import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SetDraftCard } from '../SetDraftCard';

const mockClientQuery = vi.hoisted(() => vi.fn());
const appendExchange = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockSaveTemplateSet = vi.hoisted(() => vi.fn());
let listItems: Array<Record<string, unknown>> = [];

const apolloClient = { query: mockClientQuery };
vi.mock('@apollo/client/react', () => ({
  // Jedna odpowiedź na każde zapytanie: strona listy (useExercisePickerPages) i (puste) tagi.
  useQuery: () => ({
    data: {
      availableExercisesPage: {
        items: listItems,
        totalCount: listItems.length,
        page: 1,
        hasNextPage: false,
        counts: { all: listItems.length, organization: 0, fiziyo: listItems.length },
      },
      exerciseTags: [],
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => apolloClient,
}));
vi.mock('../useChatWrites', () => ({
  useSaveTemplateSet: () => ({ saveTemplateSet: mockSaveTemplateSet, saving: false }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: mockToastError, success: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({
    organizationId: 'org-1',
    patients: [{ id: 'p1', name: 'Anna' }],
    organizationSets: [],
    setsReady: true,
    appendExchange,
    markChosen: vi.fn(),
    openCreateSet: vi.fn(),
  }),
  toWizardPatient: () => undefined,
}));

/**
 * Szkic zestawu w czacie liczy czas jak aplikacja pacjenta: lista z czatu nie niesie treści, więc wersja rekordu
 * dochodzi z treści ćwiczeń szkicu (odbiór #234, B2). Wektor: 10 powtórzeń, 3 serie, 3 s, przerwa 2 s,
 * między seriami 30 s, przygotowanie 5 s: rekord 3.3 = 359 s (6 min), rekord bez wersji = 209 s (3 min).
 */
const alternating = {
  id: 'ex-alt',
  name: 'Wykrok',
  type: 'REPS',
  side: 'ALTERNATING',
  defaultSets: 3,
  defaultReps: 10,
  defaultExecutionTime: 3,
  defaultRestBetweenSets: 30,
  defaultRestBetweenReps: 2,
  preparationTime: 5,
  updatedAt: 't1',
};

const renderCard = () =>
  render(<SetDraftCard spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'] } as never} testId="draft" messageId="m1" />);

const dailyMinutes = () => screen.getByTestId('draft').textContent?.match(/dziennie ok\. (\d+) min/)?.[1];

describe('SetDraftCard: wersja rekordu ćwiczeń szkicu', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    appendExchange.mockReset();
    mockToastError.mockReset();
    mockSaveTemplateSet.mockReset();
    mockSaveTemplateSet.mockResolvedValue(true);
    listItems = [alternating];
  });

  it('rekord 3.3: czas na stronę po dociągnięciu treści', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
    });
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    await waitFor(() => expect(screen.getByTestId('draft-primary-btn')).not.toBeDisabled());
    expect(dailyMinutes()).toBe('6');
    expect(screen.getByTestId('draft-item-ex-alt').textContent).toContain('ok. 6 min');
    expect(mockClientQuery.mock.calls.map((call) => call[0].variables)).toEqual([{ id: 'ex-alt' }]);
  });

  it('rekord bez wersji: czas łącznie jak dotąd', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    await waitFor(() => expect(screen.getByTestId('draft-primary-btn')).not.toBeDisabled());
    expect(dailyMinutes()).toBe('4');
    expect(screen.getByTestId('draft-item-ex-alt').textContent).toContain('ok. 3 min');
  });

  it('dopóki treść się wczytuje, „Dalej” czeka (czas byłby liczony bez wersji)', async () => {
    mockClientQuery.mockReturnValue(new Promise(() => {}));
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.getByTestId('draft-primary-btn')).toBeDisabled();
    expect(screen.getByTestId('draft-save-template-btn')).toBeDisabled();
  });

  it('wersja idzie dalej w szkicu do następnego kroku', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
    });
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    await waitFor(() => expect(screen.getByTestId('draft-primary-btn')).not.toBeDisabled());
    screen.getByTestId('draft-primary-btn').click();
    const spec = appendExchange.mock.calls[0][1].spec;
    expect(spec.draft.items[0]).toMatchObject({ exerciseId: 'ex-alt', alternatingPerSide: true });
  });

  it('dopóki treść się wczytuje, czas „naprzemiennie” nie jest liczbą (wiersz i suma dzienna)', async () => {
    mockClientQuery.mockReturnValue(new Promise(() => {}));
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.getByTestId('draft-item-ex-alt').textContent).not.toMatch(/ok\. \d+ min/);
    expect(screen.getByTestId('draft').textContent).toMatch(/dziennie ok\. —/);
  });

  it('po błędzie wczytania: „Dalej” ponawia z komunikatem i nie przechodzi, po ponowieniu pyta o harmonogram z 6 min', async () => {
    mockClientQuery
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
      });
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], patientId: 'p1' } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-ex-alt');
    await waitFor(() => expect(mockToastError).not.toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('draft-primary-btn')).not.toBeDisabled());

    // Błąd: ani minut z innej wersji, ani przejścia dalej.
    expect(screen.getByTestId('draft').textContent).toMatch(/dziennie ok\. —/);
    screen.getByTestId('draft-primary-btn').click();
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(appendExchange).not.toHaveBeenCalled();

    await waitFor(() => expect(dailyMinutes()).toBe('6'));
    screen.getByTestId('draft-primary-btn').click();
    expect(appendExchange.mock.calls[0][1].text).toContain('ok. 6 min dziennie');
  });

  it('po błędzie wczytania „Zapisz w katalogu” też ponawia i nie zapisuje', async () => {
    mockClientQuery.mockRejectedValueOnce(new Error('network')).mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: { schemaVersion: '3.3' } } },
    });
    renderCard();
    await screen.findByTestId('draft-item-ex-alt');
    await waitFor(() => expect(screen.getByTestId('draft-save-template-btn')).not.toBeDisabled());
    screen.getByTestId('draft-save-template-btn').click();
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockSaveTemplateSet).not.toHaveBeenCalled();
    expect(appendExchange).not.toHaveBeenCalled();

    // Po udanym ponowieniu zapis idzie z szkicem, którego wersja jest znana.
    await waitFor(() => expect(dailyMinutes()).toBe('6'));
    screen.getByTestId('draft-save-template-btn').click();
    await waitFor(() => expect(mockSaveTemplateSet).toHaveBeenCalledTimes(1));
  });
});
