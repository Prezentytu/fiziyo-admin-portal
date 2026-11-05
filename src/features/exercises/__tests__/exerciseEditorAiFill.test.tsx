import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ExerciseEditor } from '../ExerciseEditor';
import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

const { generateEnrichment, updateCore, updateEnrichment, toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(), generateEnrichment: vi.fn(), updateCore: vi.fn(), updateEnrichment: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/aiService', () => ({ aiService: { generateEnrichment } }));

const source: ExerciseEditorSource = {
  id: 'exercise-test', name: 'Testowe ćwiczenie', type: 'REPS',
  patientDescription: 'Zachowaj mój opis.', clinicalDescription: 'Kontekst terapeuty.',
  enrichmentData: { patient: { steps: ['Zachowaj mój krok.'] } },
};

function Editor({ disabled = false }: { disabled?: boolean }) {
  const form = useExerciseEditorForm({ source, updateCore, updateEnrichment });
  return <TooltipProvider><ExerciseEditor form={form} disabled={disabled} showNameField />
    <button data-testid="exercise-editor-test-save-btn" onClick={() => void form.save()}>Zapisz szkic</button>
  </TooltipProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  generateEnrichment.mockResolvedValue({ success: true, enrichmentData: {
    patient: { steps: ['Nie zastępuj mojego kroku.'], cues: ['Nowa wskazówka AI.'] },
  } });
  updateCore.mockResolvedValue(undefined);
  updateEnrichment.mockResolvedValue(undefined);
});

describe('AI w edycji ćwiczenia', () => {
  it('korzysta z aktualnego szkicu i zapisuje propozycję dopiero po zatwierdzeniu', async () => {
    render(<Editor />);
    fireEvent.change(screen.getByTestId('exercise-editor-name-input'), { target: { value: 'Zmieniona nazwa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    await screen.findByDisplayValue('Nowa wskazówka AI.');
    expect(generateEnrichment).toHaveBeenCalledWith(expect.objectContaining({
      exerciseName: 'Zmieniona nazwa', patientDescription: 'Zachowaj mój opis.',
      clinicalDescription: 'Kontekst terapeuty.', type: 'reps',
    }));
    expect(screen.getByDisplayValue('Zachowaj mój krok.')).toBeInTheDocument();
    expect(updateEnrichment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz szkic' }));
    await waitFor(() => expect(updateEnrichment).toHaveBeenCalledWith(expect.objectContaining({
      patient: expect.objectContaining({ steps: ['Zachowaj mój krok.'], cues: ['Nowa wskazówka AI.'] }),
    })));
  });
  it('nie nadpisuje treści zmienionej podczas oczekiwania na AI', async () => {
    let finish: (value: unknown) => void = () => undefined;
    generateEnrichment.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    fireEvent.change(screen.getByDisplayValue('Zachowaj mój krok.'), { target: { value: 'Krok zmieniony podczas generowania.' } });
    await act(async () => { finish({ success: true, enrichmentData: { patient: { cues: ['Nowa wskazówka AI.'] } } }); });
    expect(screen.getByDisplayValue('Krok zmieniony podczas generowania.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nowa wskazówka AI.')).toBeInTheDocument();
  });

  it('Cofnij usuwa tylko propozycję AI i zachowuje późniejsze ręczne zmiany', async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    await screen.findByDisplayValue('Nowa wskazówka AI.');
    fireEvent.change(screen.getByDisplayValue('Zachowaj mój krok.'), { target: { value: 'Krok poprawiony po AI.' } });
    const undo = toastSuccess.mock.calls.at(-1)?.[1].action.onClick;
    expect(undo).toBeTypeOf('function');
    act(() => undo());
    expect(screen.getByDisplayValue('Krok poprawiony po AI.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nowa wskazówka AI.')).not.toBeInTheDocument();
  });

  it('Cofnij zachowuje wskazówkę AI poprawioną ręcznie', async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    await screen.findByDisplayValue('Nowa wskazówka AI.');
    fireEvent.change(screen.getByDisplayValue('Nowa wskazówka AI.'), { target: { value: 'Wskazówka poprawiona przez fizjoterapeutę.' } });
    const undo = toastSuccess.mock.calls.at(-1)?.[1].action.onClick;
    act(() => undo());
    expect(screen.getByDisplayValue('Wskazówka poprawiona przez fizjoterapeutę.')).toBeInTheDocument();
  });

  it('Cofnij zachowuje wskazówkę, której fizjoterapeuta zmienił tylko fazę', async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    await screen.findByDisplayValue('Nowa wskazówka AI.');
    fireEvent.click(screen.getByTestId('exercise-audio-cues-editor-phase-0-rest-btn'));
    const undo = toastSuccess.mock.calls.at(-1)?.[1].action.onClick;
    act(() => undo());
    expect(screen.getByDisplayValue('Nowa wskazówka AI.')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-audio-cues-editor-phase-0-rest-btn')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz szkic' }));
    await waitFor(() => expect(updateEnrichment).toHaveBeenCalledWith(expect.objectContaining({
      patient: expect.objectContaining({ cues: ['Nowa wskazówka AI.'], cue_phases: [{ cue: 0, phase: 'rest' }] }),
    })));
  });

  it('nie generuje propozycji przy zablokowanej edycji', () => {
    render(<Editor disabled />);
    expect(screen.getByRole('button', { name: 'Uzupełnij przez AI' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    expect(generateEnrichment).not.toHaveBeenCalled();
  });
});
