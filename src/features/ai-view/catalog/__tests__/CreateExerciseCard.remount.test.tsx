import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateExerciseCard } from '../CreateExerciseCard';
import { clearExerciseDrafts } from '../exerciseDraftStore';

const { ai } = vi.hoisted(() => ({
  ai: { suggestExercise: vi.fn(), generateEnrichment: vi.fn(), generateExerciseImage: vi.fn() },
}));
vi.mock('@/services/aiService', () => ({ aiService: ai }));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({
    organizationId: 'org-1',
    contextPatient: null,
    appendAssistant: vi.fn(),
    markChosen: vi.fn(),
    sendMessage: vi.fn(),
  }),
  useChatBusy: () => false,
}));
vi.mock('../../useChatMode', () => ({ useChatMode: () => ({ preference: { useAi: true } }) }));
vi.mock('../../useAvailableExercises', () => ({ useAvailableExercises: () => ({ exercises: [], loading: false }) }));
vi.mock('../useChatWrites', () => ({ useCreateExercise: () => ({ create: vi.fn(), creating: false }) }));

const SPEC = { component: 'CreateExercise' as const, name: 'Plank na przedramionach' };

const ENRICHMENT = {
  success: true,
  enrichmentData: {
    $schema: 'fiziyo-exercise-v3',
    patient: {
      summary: 'Oprzyj się na przedramionach i trzymaj ciało w linii.',
      steps: ['Połóż przedramiona na macie', 'Unieś biodra'],
      cues: ['Brzuch napięty'],
      mistakes: [{ mistake: 'Opadanie bioder', fix: 'napnij pośladki' }],
    },
    safety: { stop_if: 'Ból lędźwi' },
  },
};

const IMAGE = new File(['x'], 'plank.png', { type: 'image/png' });

/** Zgłoszenie: ćwiczenie w 3/4 gotowe, inna zakładka i powrót do czatu, a karty nie ma. */
describe('karta nowego ćwiczenia po wyjściu z czatu i powrocie', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearExerciseDrafts();
    ai.suggestExercise.mockResolvedValue({
      status: 'ok',
      suggestion: {
        type: 'time',
        exerciseSide: 'none',
        sets: 3,
        reps: null,
        duration: 30,
        restSets: 60,
        description: 'Opis z propozycji.',
        advancedParams: { tempo: null, weight: null, rangeOfMotion: null, preparationTime: 5, executionTime: null },
      },
    });
    ai.generateEnrichment.mockResolvedValue(ENRICHMENT);
    ai.generateExerciseImage.mockResolvedValue({ status: 'ok', file: IMAGE });
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:plank');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('przebieg AI kończy się w tle, a powrót pokazuje ten sam draft bez drugiego zużycia AI', async () => {
    const first = render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Generuj' }));
    // Dwie sekcje gotowe, trzecia w toku: fizjoterapeuta przechodzi na inny ekran.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId('card-section-description')).toHaveAttribute('data-state', 'done');
    fireEvent.change(screen.getByTestId('card-description-input'), { target: { value: 'Opis poprawiony ręcznie.' } });
    first.unmount();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);

    for (const section of ['params', 'description', 'steps', 'cues', 'more', 'image']) {
      expect(screen.getByTestId(`card-section-${section}`)).toHaveAttribute('data-state', 'done');
    }
    expect(screen.getByTestId('card-description-input')).toHaveValue('Opis poprawiony ręcznie.');
    expect(screen.getByTestId('card-steps-input')).toHaveValue('Połóż przedramiona na macie\nUnieś biodra');
    expect(screen.getByTestId('card-stop-if-input')).toHaveValue('Ból lędźwi');
    expect(screen.getByTestId('card-params-summary')).toHaveTextContent('3 × 30 s');
    expect(screen.getByTestId('card-image-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utwórz ćwiczenie' })).toBeEnabled();
    expect(ai.suggestExercise).toHaveBeenCalledTimes(1);
    expect(ai.generateExerciseImage).toHaveBeenCalledExactlyOnceWith(
      SPEC.name,
      'Opis poprawiony ręcznie.',
      'time'
    );
  });

  it('powrót w trakcie przebiegu pokazuje sekcje dopisywane dalej na tej samej karcie', async () => {
    const first = render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Generuj' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    first.unmount();
    render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);
    expect(screen.queryByRole('button', { name: 'Generuj' })).toBeNull();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId('card-cues-input')).toHaveValue('Brzuch napięty');
    expect(screen.getByTestId('card-section-image')).toHaveAttribute('data-state', 'done');
  });

  it('inna organizacja albo wylogowanie nie dostaje draftu ani wyników przebiegu', async () => {
    const first = render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Generuj' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    first.unmount();
    clearExerciseDrafts();
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    render(<CreateExerciseCard spec={SPEC} testId="card" messageId="m1" />);
    expect(screen.getByRole('button', { name: 'Generuj' })).toBeInTheDocument();
    expect(screen.queryByTestId('card-section-params')).toBeNull();
    expect(ai.generateExerciseImage).not.toHaveBeenCalled();
  });
});
