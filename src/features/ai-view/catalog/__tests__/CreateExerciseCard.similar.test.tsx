import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateExerciseCard } from '../CreateExerciseCard';

const actions = vi.hoisted(() => ({
  markChosen: vi.fn(),
  appendAssistant: vi.fn(),
  sendMessage: vi.fn(),
}));
const ai = vi.hoisted(() => ({ suggestExerciseVariants: vi.fn() }));
const mode = vi.hoisted(() => ({ useAi: false }));

vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ organizationId: 'org-1', contextPatient: null, ...actions }),
  useChatBusy: () => false,
}));
vi.mock('../../useChatMode', () => ({ useChatMode: () => ({ preference: { useAi: mode.useAi } }) }));
vi.mock('../../useAvailableExercises', () => ({
  useAvailableExercises: () => ({
    exercises: [
      { id: 'ex-row', name: 'Wiosłowanie z gumą w siadzie', type: 'reps', defaultSets: 3, defaultReps: 10 },
      { id: 'ex-chin', name: 'Cofanie brody przy ścianie', type: 'reps', defaultSets: 2, defaultReps: 8 },
    ],
    loading: false,
  }),
}));
vi.mock('../useChatWrites', () => ({ useCreateExercise: () => ({ create: vi.fn(), creating: false }) }));
vi.mock('@/services/aiService', () => ({ aiService: ai }));

const BACK = { exerciseIds: ['ex-a'], note: 'szyja' };

// 26.11 (Przemek): po wpisaniu nazwy pytamy „Czy chodziło Ci o” i pokazujemy podobne z katalogu, z podglądem.
describe('karta nowego ćwiczenia: podobne nazwy i ćwiczenia z katalogu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mode.useAi = false;
  });
  afterEach(() => vi.useRealTimers());

  it('podobne z katalogu bez AI: podgląd i „Dodaj do zestawu” zamiast tworzenia nowego', () => {
    render(<CreateExerciseCard spec={{ component: 'CreateExercise', addToSet: BACK }} testId="card" messageId="m1" />);
    fireEvent.change(screen.getByTestId('card-name-input'), { target: { value: 'wiosłowanie z gumą' } });

    expect(screen.getByTestId('card-name-suggestions-similar').textContent).toContain('Wiosłowanie z gumą w siadzie');
    expect(ai.suggestExerciseVariants).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('card-name-suggestions-similar-ex-row-preview-btn'));
    expect(screen.getByTestId('card-catalog-preview-dialog')).toBeTruthy();
    fireEvent.keyDown(screen.getByTestId('card-catalog-preview-dialog'), { key: 'Escape' });

    fireEvent.click(screen.getByTestId('card-name-suggestions-similar-ex-row-use-btn'));
    expect(actions.markChosen).toHaveBeenCalledWith('m1', 'used-existing');
    expect(actions.appendAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: expect.objectContaining({
          component: 'SetDraft',
          exerciseIds: ['ex-a', 'ex-row'],
          addedExerciseId: 'ex-row',
        }),
      })
    );
  });

  it('z AI: po przerwie w pisaniu „Czy chodziło Ci o”, a klik podstawia nazwę', async () => {
    vi.useFakeTimers();
    mode.useAi = true;
    ai.suggestExerciseVariants.mockResolvedValue([
      { name: 'Retrakcja szyi w siadzie' },
      { name: 'Cofanie brody przy ścianie' },
    ]);
    render(<CreateExerciseCard spec={{ component: 'CreateExercise' }} testId="card" messageId="m2" />);

    fireEvent.change(screen.getByTestId('card-name-input'), { target: { value: 'retrakcja szyji' } });
    expect(ai.suggestExerciseVariants).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(ai.suggestExerciseVariants).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('card-name-suggestions-names').textContent).toContain('Retrakcja szyi w siadzie');
    // Nazwa z AI, która jest w katalogu, pokazuje to ćwiczenie jako podobne.
    expect(screen.getByTestId('card-name-suggestions-similar').textContent).toContain('Cofanie brody przy ścianie');

    fireEvent.click(screen.getByTestId('card-name-suggestions-name-0-btn'));
    expect(screen.getByTestId('card-name-input')).toHaveValue('Retrakcja szyi w siadzie');
    // Nazwa z podpowiedzi nie kosztuje drugiego zapytania: zostają pozostałe podpowiedzi.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(ai.suggestExerciseVariants).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('card-name-suggestions-names').textContent).toContain('Cofanie brody przy ścianie');
  });
});
