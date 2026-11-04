import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ExerciseEditor } from '../ExerciseEditor';
import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

const { generateEnrichment, updateCore, updateEnrichment } = vi.hoisted(() => ({
  generateEnrichment: vi.fn(), updateCore: vi.fn(), updateEnrichment: vi.fn(),
}));
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
  it('nie generuje propozycji przy zablokowanej edycji', () => {
    render(<Editor disabled />);
    expect(screen.getByRole('button', { name: 'Uzupełnij przez AI' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij przez AI' }));
    expect(generateEnrichment).not.toHaveBeenCalled();
  });
});
