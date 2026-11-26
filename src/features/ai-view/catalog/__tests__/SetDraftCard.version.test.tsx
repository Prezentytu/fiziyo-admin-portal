import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SetDraftCard } from '../SetDraftCard';

const mockClientQuery = vi.hoisted(() => vi.fn());
const appendExchange = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockSaveTemplateSet = vi.hoisted(() => vi.fn());
const openCreateSet = vi.hoisted(() => vi.fn());
const reportLiveDraft = vi.hoisted(() => vi.fn());
const restoreDraft = vi.hoisted(() => vi.fn());
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
    openCreateSet,
    reportLiveDraft,
    restoreDraft,
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
  render(
    <SetDraftCard spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'] } as never} testId="draft" messageId="m1" />
  );

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
    mockClientQuery.mockRejectedValueOnce(new Error('network')).mockResolvedValue({
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
    expect(appendExchange).not.toHaveBeenCalled();

    // Po udanym ponowieniu pytanie „Jak często?” dostaje szkic, którego wersja jest znana; zapis dopiero po wyborze.
    await waitFor(() => expect(dailyMinutes()).toBe('6'));
    screen.getByTestId('draft-save-template-btn').click();
    expect(appendExchange).toHaveBeenCalledTimes(1);
    const [, reply] = appendExchange.mock.calls[0];
    expect(reply.spec.component).toBe('CatalogFrequency');
    expect(reply.spec.draft.items[0].alternatingPerSide).toBe(true);
    expect(mockSaveTemplateSet).not.toHaveBeenCalled();
  });

  // Test asystenta 17.11 (W20, P88): „Pełny edytor” otwierał się z pustą nazwą, choć karta ją miała.
  it('„Pełny edytor” dostaje nazwę z karty', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    openCreateSet.mockReset();
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], note: 'po rekonstrukcji ACL' } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-ex-alt');
    screen.getByTestId('draft-full-editor-btn').click();
    expect(openCreateSet).toHaveBeenCalledWith(
      ['ex-alt'],
      undefined,
      expect.stringMatching(/^Po rekonstrukcji ACL · \d\d\.\d\d$/),
      []
    );
  });

  // SPEC-061: rozgrzewka, którą terapeuta zostawił w propozycji, idzie do pełnego edytora; zdjęta już nie.
  it('„Pełny edytor” dostaje rozgrzewkę z karty, a zdjęty znacznik przestaje się liczyć', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    openCreateSet.mockReset();
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], warmupExerciseIds: ['ex-alt'] } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-warmup-ex-alt');
    screen.getByTestId('draft-full-editor-btn').click();
    expect(openCreateSet).toHaveBeenLastCalledWith(['ex-alt'], undefined, expect.any(String), ['ex-alt']);

    screen.getByTestId('draft-warmup-ex-alt-clear-btn').click();
    await waitFor(() => expect(screen.queryByTestId('draft-warmup-ex-alt')).toBeNull());
    screen.getByTestId('draft-full-editor-btn').click();
    expect(openCreateSet).toHaveBeenLastCalledWith(['ex-alt'], undefined, expect.any(String), []);
  });

  // Demo 18.11: droga do nowego ćwiczenia była schowana za wyszukiwarką (dopiero po 3 znakach).
  // 26.11 (Przemek): jeden przycisk „Dodaj ćwiczenie”; tworzenie z AI jest od razu pod wyszukiwarką.
  it('„Dodaj ćwiczenie” od razu daje „Utwórz nowe ćwiczenie z AI”, a nowe ćwiczenie wraca do tej propozycji', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    appendExchange.mockReset();
    reportLiveDraft.mockReset();
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], note: 'biodro' } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-ex-alt');
    // Karta zgłasza wątkowi swój stan: „dodaj ćwiczenie X” z czatu dopisuje do tej propozycji.
    expect(reportLiveDraft).toHaveBeenLastCalledWith(
      'm1',
      expect.objectContaining({ draft: expect.objectContaining({ exerciseIds: ['ex-alt'], note: 'biodro' }) })
    );
    expect(screen.queryByTestId('draft-create-btn')).toBeNull();
    fireEvent.click(screen.getByTestId('draft-add-btn'));
    fireEvent.click(screen.getByTestId('draft-create-btn'));
    expect(appendExchange).toHaveBeenCalledWith(
      'Utwórz nowe ćwiczenie',
      expect.objectContaining({
        spec: expect.objectContaining({
          component: 'CreateExercise',
          addToSet: expect.objectContaining({ exerciseIds: ['ex-alt'], note: 'biodro' }),
        }),
      })
    );
  });

  it('wpisana nazwa spoza katalogu: „Brak pasujących” i utworzenie tej nazwy z AI', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    appendExchange.mockReset();
    render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], note: 'biodro' } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-ex-alt');
    fireEvent.click(screen.getByTestId('draft-add-btn'));
    fireEvent.change(screen.getByTestId('draft-add-search-input'), { target: { value: 'wiosłowanie z gumą' } });

    expect(screen.getByTestId('draft-add-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('draft-add-create-btn'));
    expect(appendExchange).toHaveBeenCalledWith(
      'Utwórz ćwiczenie: wiosłowanie z gumą',
      expect.objectContaining({
        spec: expect.objectContaining({ component: 'CreateExercise', name: 'wiosłowanie z gumą' }),
      })
    );
  });

  // Decyzja właściciela 18.11: po powrocie zestawu z dopisanym ćwiczeniem widać, która pozycja doszła.
  it('dopisana pozycja ma plakietkę „nowe”, a karta bez tej informacji jej nie pokazuje', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    const { unmount } = render(
      <SetDraftCard
        spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'], addedExerciseId: 'ex-alt' } as never}
        testId="draft"
        messageId="m1"
      />
    );
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.getByTestId('draft-new-ex-alt').textContent).toBe('nowe');
    unmount();

    render(
      <SetDraftCard spec={{ component: 'SetDraft', exerciseIds: ['ex-alt'] } as never} testId="draft" messageId="m2" />
    );
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.queryByTestId('draft-new-ex-alt')).toBeNull();
  });

  // Decyzja właściciela 18.11: zablokowana wersja zestawu daje się przywrócić, wysłana albo zapisana nie.
  it('zablokowana przez nowszą wersję karta ma „Wróć do tej wersji” i oddaje swoje pozycje w całości', async () => {
    mockClientQuery.mockResolvedValue({
      data: { exerciseById: { id: 'ex-alt', updatedAt: 't1', enrichmentData: {} } },
    });
    restoreDraft.mockReset();
    const spec = { component: 'SetDraft', exerciseIds: ['ex-alt'], note: 'biodro' };
    const { unmount } = render(<SetDraftCard spec={spec as never} testId="draft" messageId="m1" chosen="superseded" />);
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.queryByTestId('draft-primary-btn')).toBeNull();
    expect(screen.queryByTestId('draft-add-btn')).toBeNull();
    screen.getByTestId('draft-restore-btn').click();
    expect(restoreDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        component: 'SetDraft',
        exerciseIds: ['ex-alt'],
        note: 'biodro',
        items: [expect.objectContaining({ exerciseId: 'ex-alt' })],
      })
    );
    unmount();

    render(<SetDraftCard spec={spec as never} testId="draft" messageId="m2" chosen="next" />);
    await screen.findByTestId('draft-item-ex-alt');
    expect(screen.queryByTestId('draft-restore-btn')).toBeNull();
  });
});
