import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateExerciseCard } from '../CreateExerciseCard';
import { ExerciseResultsCard } from '../ExerciseResultsCard';

const state = vi.hoisted(() => ({
  library: vi.fn(),
  variants: vi.fn(),
  create: vi.fn(),
  appendExchange: vi.fn(),
  appendAssistant: vi.fn(),
  markChosen: vi.fn(),
}));
vi.mock('@/hooks/useExercisePickerPages', () => ({ useExercisePickerPages: state.library }));
vi.mock('@/services/aiService', () => ({
  aiService: {
    suggestExerciseVariants: state.variants,
    suggestExercise: async () => ({
      status: 'ok',
      suggestion: { sets: 2, reps: 7, description: 'Opis zaproponowany przez asystenta.' },
    }),
    generateEnrichment: async () => null,
    generateExerciseImage: async () => ({ status: 'error' }),
  },
}));
vi.mock('../useChatWrites', () => ({ useCreateExercise: () => ({ create: state.create, creating: false }) }));
vi.mock('../../useChatMode', () => ({ useChatMode: () => ({ preference: { useAi: true } }) }));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ organizationId: 'org', patients: [], ...state }),
  useChatBusy: () => false,
}));

const forSet = { exerciseIds: [], note: 'zdrowe plecy' };
const spec = { component: 'ExerciseResults' as const, query: 'zdrowe plecy', exerciseIds: [], forSet };
const show = () => render(<ExerciseResultsCard spec={spec} messageId="s1" testId="results" />);

describe('brak ćwiczenia do zestawu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    state.library.mockReturnValue({ items: [], loading: false });
    state.variants.mockResolvedValue([
      { name: 'Testowy ruch w siadzie', position: 'siad', equipment: null, side: 'none', level: 'easy' },
    ]);
  });

  it('przechodzi od braku dopasowań przez propozycję AI i zapis do szkicu zestawu', async () => {
    const { unmount } = show();
    await screen.findByText('Testowy ruch w siadzie');
    expect(state.library).toHaveBeenCalledWith({ organizationId: 'org', search: 'plec', sourceFilter: 'all' });
    expect(state.variants).toHaveBeenCalledWith('zdrowe plecy');
    fireEvent.click(screen.getByTestId('results-ideas-item-0-create-btn'));
    expect(state.create).not.toHaveBeenCalled();
    const next = state.appendExchange.mock.calls[0][1].spec;
    expect(next).toEqual({ component: 'CreateExercise', name: 'Testowy ruch w siadzie', addToSet: forSet });
    unmount();
    render(<CreateExerciseCard spec={next} messageId="s2" testId="form" />);
    fireEvent.click(screen.getByTestId('form-generate-btn'));
    await waitFor(
      () => expect(screen.getByTestId('form-description-input')).toHaveValue('Opis zaproponowany przez asystenta.'),
      { timeout: 4000 }
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Utwórz ćwiczenie' })).toBeEnabled(), {
      timeout: 5000,
    });
    expect(state.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('form-description-input'), {
      target: { value: 'Opis sprawdzony przez fizjoterapeutę.' },
    });
    state.create.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'saved', name: next.name });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz ćwiczenie' }));
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.appendAssistant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz ćwiczenie' }));
    await waitFor(() =>
      expect(state.appendAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          spec: {
            component: 'SetDraft',
            note: 'zdrowe plecy',
            exerciseIds: ['saved'],
            addedExerciseId: 'saved',
          },
        })
      )
    );
  });

  it('po ponownym otwarciu rozmowy zachowuje propozycje bez generowania ich drugi raz', async () => {
    const view = show();
    await screen.findByText('Testowy ruch w siadzie');
    view.unmount();
    show();
    await screen.findByText('Testowy ruch w siadzie');
    expect(state.variants).toHaveBeenCalledTimes(1);
  });

  it('nie zgłasza braku ćwiczeń ani nie generuje propozycji przy błędzie biblioteki', () => {
    state.library.mockReturnValue({ items: [], loading: false, error: new Error('offline') });
    show();
    expect(screen.getByText('Nie udało się sprawdzić katalogu')).toBeInTheDocument();
    expect(state.variants).not.toHaveBeenCalled();
  });

  it('pokazuje dostępne ćwiczenie przed generowaniem nowego', () => {
    state.library.mockReturnValue({ items: [{ id: 'one', name: 'Ruch z katalogu' }], loading: false });
    show();
    expect(screen.getByText('Ruch z katalogu')).toBeInTheDocument();
    expect(state.variants).not.toHaveBeenCalled();
  });
});
