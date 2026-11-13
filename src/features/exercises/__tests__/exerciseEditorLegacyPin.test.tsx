import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { compactEnrichment } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';

import { ExerciseEditor } from '../ExerciseEditor';
import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

/**
 * Pins the edit form of a record WITHOUT `schemaVersion` (old shape): the set of inputs and what is saved.
 * The v3.3 form (SPEC-038) must not change anything asserted here.
 */

const { updateCore, updateEnrichment } = vi.hoisted(() => ({ updateCore: vi.fn(), updateEnrichment: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/aiService', () => ({ aiService: { generateEnrichment: vi.fn() } }));

const legacySource: ExerciseEditorSource = {
  id: 'legacy-1',
  name: 'Przysiad przy ścianie',
  type: 'REPS',
  patientDescription: 'Stań przy ścianie i zejdź w dół.',
  clinicalDescription: 'Izometria czworogłowych.',
  notes: 'Pilnuj kolan.',
  audioCue: 'Plecy przy ścianie.',
  enrichmentData: {
    $schema: 'fiziyo-exercise-v3',
    patient: { summary: 'Przysiad z oparciem.', steps: ['Stań przy ścianie.'], cues: ['Kolana nad stopami.'] },
    safety: { stop_if: 'Ostry ból kolana.', intensity_guide: 'Wysiłek 5/10.' },
    therapist: { clinical_notes: 'Uwaga na rzepkę.', indications: ['Osłabienie uda'], contraindications: ['Świeży uraz'] },
    ai: { keywords: ['przysiad'], problems: ['ból kolana'] },
    equipment: ['ściana'],
  },
};

function Editor({ source }: Readonly<{ source: ExerciseEditorSource }>) {
  const form = useExerciseEditorForm({ source, updateCore, updateEnrichment });
  return (
    <TooltipProvider>
      <ExerciseEditor form={form} showAdvancedJson />
    </TooltipProvider>
  );
}

function contentFieldTestIds(): string[] {
  const root = screen.getByTestId('exercise-content-sections');
  return Array.from(root.querySelectorAll('input[data-testid], textarea[data-testid], [role="switch"][data-testid]'))
    .map((element) => element.getAttribute('data-testid') ?? '')
    .sort();
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCore.mockResolvedValue(undefined);
  updateEnrichment.mockResolvedValue(undefined);
});

describe('formularz edycji rekordu starego (bez schemaVersion)', () => {
  it('pokazuje dokładnie dzisiejsze pola treści', () => {
    render(<Editor source={legacySource} />);

    expect(contentFieldTestIds()).toMatchInlineSnapshot(`
      [
        "enrichment-clinical-benefits-item-0",
        "enrichment-clinical-notes-input",
        "enrichment-contraindications-item-0",
        "enrichment-indications-item-0",
        "enrichment-progression-notes-input",
        "enrichment-rehab-phases-item-0",
        "exercise-audio-cue-input",
        "exercise-audio-cues-editor-item-0",
        "exercise-detail-ai-contraindicated-item-0",
        "exercise-detail-ai-keywords-item-0",
        "exercise-detail-ai-problems-item-0",
        "exercise-detail-ai-suitable-item-0",
        "exercise-detail-clinical-description-input",
        "exercise-detail-equipment-item-0",
        "exercise-detail-intensity-guide-input",
        "exercise-detail-mistake-fix-0",
        "exercise-detail-mistake-text-0",
        "exercise-detail-notes-input",
        "exercise-detail-patient-description-input",
        "exercise-detail-patient-summary-input",
        "exercise-detail-requires-supervision-switch",
        "exercise-detail-should-feel-input",
        "exercise-detail-should-not-feel-input",
        "exercise-detail-stop-if-input",
        "exercise-detail-video-url-input",
        "exercise-detail-when-to-do-input",
        "exercise-detail-why-input",
        "exercise-execution-steps-editor-item-0",
      ]
    `);
  });

  it('zapisuje stare kolumny opisu, notatki i polecenia audio, gdy fizjoterapeuta je zmieni', async () => {
    const { result } = renderHook(() => useExerciseEditorForm({ source: legacySource, updateCore, updateEnrichment }));

    act(() => {
      result.current.setCoreField('patientDescription', 'Nowy opis.');
      result.current.setCoreField('clinicalDescription', 'Nowy opis kliniczny.');
      result.current.setCoreField('notes', '');
      result.current.setCoreField('audioCue', 'Nowe polecenie.');
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).toHaveBeenCalledWith({
      description: 'Nowy opis.',
      clinicalDescription: 'Nowy opis kliniczny.',
      notes: null,
      audioCue: 'Nowe polecenie.',
    });
    expect(updateEnrichment).not.toHaveBeenCalled();
  });

  it('zapisuje cały dokument po przycięciu pustych wartości, razem z polami starego kształtu', async () => {
    const { result } = renderHook(() => useExerciseEditorForm({ source: legacySource, updateCore, updateEnrichment }));

    act(() => {
      result.current.setEnrichmentPath('therapist.clinical_notes', 'Zmieniona notatka.');
      result.current.setEnrichmentPath('equipment', []);
      result.current.setEnrichmentPath('safety.intensity_guide', '  ');
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateEnrichment).toHaveBeenCalledWith({
      $schema: 'fiziyo-exercise-v3',
      patient: { summary: 'Przysiad z oparciem.', steps: ['Stań przy ścianie.'], cues: ['Kolana nad stopami.'] },
      safety: { stop_if: 'Ostry ból kolana.' },
      therapist: {
        clinical_notes: 'Zmieniona notatka.',
        indications: ['Osłabienie uda'],
        contraindications: ['Świeży uraz'],
      },
      ai: { keywords: ['przysiad'], problems: ['ból kolana'] },
    });
    expect(updateCore).not.toHaveBeenCalled();
  });

  it('nie zapisuje niczego, gdy nic nie zmieniono', async () => {
    const { result } = renderHook(() => useExerciseEditorForm({ source: legacySource, updateCore, updateEnrichment }));

    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).not.toHaveBeenCalled();
    expect(updateEnrichment).not.toHaveBeenCalled();
  });

  it('panel JSON stosuje dokument starego kształtu jak dotąd', async () => {
    render(<Editor source={legacySource} />);

    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-trigger'));
    const textarea = await screen.findByTestId('exercise-editor-advanced-json-textarea');
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ patient: { summary: 'Z panelu JSON.' }, equipment: ['mata'] }) },
    });
    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-apply-btn'));

    await waitFor(() => expect(screen.getByTestId('exercise-detail-patient-summary-input')).toHaveValue('Z panelu JSON.'));
    expect(screen.getByTestId('exercise-detail-equipment-item-0')).toHaveValue('mata');
  });
});

describe('schemaVersion w dzisiejszych przejściach dokumentu', () => {
  const document = { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.3', patient: { summary: 'Opis.' } };

  it('compactEnrichment zostawia schemaVersion', () => {
    expect(compactEnrichment(document)).toEqual(document);
  });

  it('toV3 zostawia schemaVersion tylko wtedy, gdy dokument ma znacznik $schema', () => {
    expect(toV3(document).schemaVersion).toBe('3.3');
    expect(toV3({ schemaVersion: '3.3', patient: { summary: 'Opis.' } }).schemaVersion).toBeUndefined();
  });
});
