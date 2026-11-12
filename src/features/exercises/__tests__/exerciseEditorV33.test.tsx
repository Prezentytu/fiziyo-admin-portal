import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { TooltipProvider } from '@/components/ui/tooltip';
import { isV33EditablePath, V33_EDITABLE_PATHS } from '@/components/shared/exercise/writeExerciseContent';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { ExerciseEditor } from '../ExerciseEditor';
import {
  buildChangedCoreVariables,
  useExerciseEditorForm,
  type ExerciseCoreDraft,
  type ExerciseEditorSource,
} from '../useExerciseEditorForm';
import { buildEnrichmentUpdateVariables } from '../utils/buildEnrichmentUpdateVariables';

const { generateEnrichment, updateCore, updateEnrichment } = vi.hoisted(() => ({
  generateEnrichment: vi.fn(),
  updateCore: vi.fn(),
  updateEnrichment: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/aiService', () => ({ aiService: { generateEnrichment } }));

const document = fixture as ExerciseEnrichmentData;

/** A 3.3 record whose retired columns are still filled in the database. */
const v33Source: ExerciseEditorSource = {
  id: 'fx-0073',
  name: 'Napinanie mięśnia czworogłowego',
  type: 'TIME',
  patientDescription: 'Stary opis dla pacjenta.',
  clinicalDescription: 'Stary opis kliniczny.',
  notes: 'Stara notatka.',
  audioCue: 'Stare polecenie.',
  enrichmentData: document,
};

function withoutKeys(value: ExerciseEnrichmentData, paths: string[]): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(value)) as Record<string, Record<string, unknown>>;
  for (const path of paths) {
    const [first, second] = path.split('.');
    if (second) delete copy[first]?.[second];
    else delete copy[first];
  }
  return copy;
}

function sentDocument(): ExerciseEnrichmentData {
  return updateEnrichment.mock.calls.at(-1)?.[0] as ExerciseEnrichmentData;
}

function renderForm(source: ExerciseEditorSource = v33Source) {
  return renderHook(() => useExerciseEditorForm({ source, updateCore, updateEnrichment }));
}

function Editor({ source = v33Source }: Readonly<{ source?: ExerciseEditorSource }>) {
  const form = useExerciseEditorForm({ source, updateCore, updateEnrichment });
  return (
    <TooltipProvider>
      <ExerciseEditor form={form} showAdvancedJson />
      <button type="button" data-testid="exercise-editor-test-save-btn" onClick={() => void form.save()}>
        Zapisz szkic
      </button>
    </TooltipProvider>
  );
}

function contentFieldTestIds(): string[] {
  const root = screen.getByTestId('exercise-content-sections');
  return Array.from(root.querySelectorAll('input[data-testid], textarea[data-testid], [role="switch"][data-testid]'))
    .map((element) => element.getAttribute('data-testid') ?? '')
    .filter((testId) => !/-(item|label|qty|required|text|fix)-[1-9]\d*$/.test(testId))
    .sort();
}

async function saveDraft() {
  fireEvent.click(screen.getByTestId('exercise-editor-test-save-btn'));
  await waitFor(() => expect(updateEnrichment).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCore.mockResolvedValue(undefined);
  updateEnrichment.mockResolvedValue(undefined);
});

describe('zapis rekordu 3.3: dokument', () => {
  it('rozpoznaje wersję i bez zmian niczego nie wysyła', async () => {
    const { result } = renderForm();

    expect(result.current.contentVersion).toBe('3.3');
    expect(result.current.enrichment).toEqual(document);
    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).not.toHaveBeenCalled();
    expect(updateEnrichment).not.toHaveBeenCalled();
  });

  it('po zmianie jednego pola wysyła cały wczytany dokument z tą jedną różnicą', async () => {
    const { result } = renderForm();

    act(() => result.current.setEnrichmentPath('patient.summary', 'Nowe podsumowanie.'));
    expect(result.current.isDirty).toBe(true);
    await act(async () => {
      await result.current.save();
    });

    expect(updateEnrichment).toHaveBeenCalledTimes(1);
    expect(sentDocument().patient?.summary).toBe('Nowe podsumowanie.');
    expect(sentDocument().schemaVersion).toBe('3.3');
    expect(sentDocument().$schema).toBe('fiziyo-exercise-v3');
    expect(withoutKeys(sentDocument(), ['patient.summary'])).toEqual(withoutKeys(document, ['patient.summary']));
    expect(Object.keys(sentDocument())).toEqual(Object.keys(document));
    expect(JSON.parse(buildEnrichmentUpdateVariables('fx-0073', sentDocument()).enrichmentDataJson)).toEqual(sentDocument());
  });

  it('nie przycina pustych kluczy, których fizjoterapeuta nie ruszył', async () => {
    const source = {
      ...v33Source,
      enrichmentData: { ...document, spoza_kontraktu: { lista: [] }, puste: null } as ExerciseEnrichmentData,
    };
    const { result } = renderForm(source);

    act(() => result.current.setEnrichmentPath('patient.harder', 'Trudniej.'));
    await act(async () => {
      await result.current.save();
    });

    expect(sentDocument()).toMatchObject({ spoza_kontraktu: { lista: [] }, puste: null, breathing: { pattern: null } });
  });

  it('pola wycofane wpisane do szkicu dokumentu nie są zmianą i nie są wysyłane', async () => {
    const { result } = renderForm();

    act(() => {
      result.current.setEnrichmentPath('therapist.clinical_notes', 'Notatka w starym polu.');
      result.current.setEnrichmentPath('therapist.indications', ['Wskazanie']);
      result.current.setEnrichmentPath('therapist.contraindications', ['Przeciwwskazanie']);
      result.current.setEnrichmentPath('equipment', ['mata']);
      result.current.setEnrichmentPath('ai.problems', ['ból']);
      result.current.setEnrichmentPath('safety.intensity_guide', '5/10');
    });
    expect(result.current.isDirty).toBe(false);
    // The hook refuses a path the save would drop, so a screen that wires one shows it at once.
    expect(result.current.enrichment).toEqual(document);
    await act(async () => {
      await result.current.save();
    });

    expect(updateEnrichment).not.toHaveBeenCalled();
  });

  it('drugi zapis startuje od dokumentu z pierwszego zapisu', async () => {
    const { result } = renderForm();

    act(() => result.current.setEnrichmentPath('patient.easier', 'Łatwiej.'));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });
    expect(updateEnrichment).toHaveBeenCalledTimes(1);

    act(() => result.current.setEnrichmentPath('patient.harder', 'Trudniej.'));
    await act(async () => {
      await result.current.save();
    });

    expect(sentDocument().patient).toMatchObject({ easier: 'Łatwiej.', harder: 'Trudniej.' });
    expect(withoutKeys(sentDocument(), ['patient.easier', 'patient.harder'])).toEqual(
      withoutKeys(document, ['patient.easier', 'patient.harder'])
    );
  });

  it('kolumna schemaVersion przełącza zapis także wtedy, gdy dokument nie niesie wersji', async () => {
    const { schemaVersion: _dropped, ...withoutVersion } = document;
    const { result } = renderForm({ ...v33Source, schemaVersion: '3.3', enrichmentData: withoutVersion });

    expect(result.current.contentVersion).toBe('3.3');
    act(() => result.current.setEnrichmentPath('patient.why', 'Po co.'));
    await act(async () => {
      await result.current.save();
    });

    expect(withoutKeys(sentDocument(), ['patient.why'])).toEqual(withoutKeys(withoutVersion, ['patient.why']));
  });
});

describe('zapis rekordu 3.3: kolumny wycofane', () => {
  it('nie wysyła opisu, opisu klinicznego, notatki ani polecenia audio, nawet po zmianie w szkicu', async () => {
    const { result } = renderForm();

    act(() => {
      result.current.setCoreField('name', 'Nowa nazwa');
      result.current.setCoreField('patientDescription', 'Nowy opis.');
      result.current.setCoreField('clinicalDescription', '');
      result.current.setCoreField('notes', '');
      result.current.setCoreField('audioCue', 'Nowe polecenie.');
      result.current.setCoreField('sets', 4);
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).toHaveBeenCalledTimes(1);
    expect(updateCore).toHaveBeenCalledWith({ name: 'Nowa nazwa', sets: 4 });
  });

  it('zmiana samych pól wycofanych nie jest zmianą do zapisu', async () => {
    const { result } = renderForm();

    act(() => {
      result.current.setCoreField('patientDescription', '');
      result.current.setCoreField('notes', '');
    });
    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).not.toHaveBeenCalled();
  });

  it('buildChangedCoreVariables: rekord 3.3 pomija kolumny wycofane, rekord stary wysyła je jak dotąd', () => {
    const { result } = renderForm();
    const initial: ExerciseCoreDraft = result.current.core;
    const current: ExerciseCoreDraft = {
      ...initial,
      patientDescription: '',
      clinicalDescription: 'Zmiana.',
      notes: '',
      audioCue: '',
      tempo: '2-0-2',
    };

    expect(buildChangedCoreVariables(initial, current, '3.3')).toEqual({ tempo: '2-0-2' });
    expect(buildChangedCoreVariables(initial, current)).toEqual({
      description: null,
      clinicalDescription: 'Zmiana.',
      notes: null,
      audioCue: null,
      tempo: '2-0-2',
    });
    expect(buildChangedCoreVariables(initial, initial, '3.3')).toEqual({});
  });
});

describe('formularz rekordu 3.3', () => {
  it('pokazuje pola 3.3 i nie renderuje pól wycofanych ani sekcji zespołu', () => {
    render(<Editor />);

    expect(contentFieldTestIds()).toMatchInlineSnapshot(`
      [
        "exercise-audio-cues-editor-item-0",
        "exercise-detail-breathing-input",
        "exercise-detail-checkpoints-item-0",
        "exercise-detail-contraindications-item-0",
        "exercise-detail-easier-input",
        "exercise-detail-equipment-items-label-0",
        "exercise-detail-equipment-items-qty-0",
        "exercise-detail-equipment-items-required-0",
        "exercise-detail-equipment-subs-0-item-0",
        "exercise-detail-equipment-subs-1-item-0",
        "exercise-detail-harder-input",
        "exercise-detail-mistake-fix-0",
        "exercise-detail-mistake-text-0",
        "exercise-detail-patient-summary-input",
        "exercise-detail-precautions-item-0",
        "exercise-detail-requires-supervision-switch",
        "exercise-detail-should-feel-input",
        "exercise-detail-should-not-feel-input",
        "exercise-detail-stop-if-input",
        "exercise-detail-therapist-note-input",
        "exercise-detail-video-url-input",
        "exercise-detail-when-to-do-input",
        "exercise-detail-why-input",
        "exercise-execution-steps-editor-item-0",
      ]
    `);
    for (const retired of [
      'exercise-detail-patient-description-input',
      'exercise-detail-clinical-description-input',
      'exercise-detail-notes-input',
      'exercise-audio-cue-input',
      'enrichment-clinical-notes-input',
      'enrichment-indications-item-0',
      'enrichment-contraindications-item-0',
      'exercise-detail-equipment-item-0',
      'exercise-detail-intensity-guide-input',
      'exercise-detail-ai-problems-item-0',
      'exercise-detail-ai-keywords-item-0',
    ]) {
      expect(screen.queryByTestId(retired), retired).not.toBeInTheDocument();
    }
  });

  it('wczytuje wartości pól 3.3 z dokumentu', () => {
    render(<Editor />);

    expect(screen.getByTestId('exercise-detail-easier-input')).toHaveValue(document.patient?.easier);
    expect(screen.getByTestId('exercise-detail-harder-input')).toHaveValue(document.patient?.harder);
    expect(screen.getByTestId('exercise-detail-breathing-input')).toHaveValue(document.breathing?.text);
    expect(screen.getByTestId('exercise-detail-checkpoints-item-4')).toHaveValue('pełne rozluźnienie między napięciami');
    expect(screen.getByTestId('exercise-detail-contraindications-item-0')).toHaveValue(
      document.safety?.contraindications?.[0].text
    );
    expect(screen.getByTestId('exercise-detail-equipment-items-label-1')).toHaveValue('mały zrolowany ręcznik');
    expect(screen.getByTestId('exercise-detail-equipment-items-qty-1')).toHaveValue(1);
    expect(screen.getByTestId('exercise-detail-equipment-items-required-1')).toBeChecked();
    expect(screen.getByTestId('exercise-detail-therapist-note-input')).toHaveValue('');
  });

  it('edycja tekstu punktu kontrolnego zachowuje jego pozostałe klucze', async () => {
    render(<Editor />);

    fireEvent.change(screen.getByTestId('exercise-detail-checkpoints-item-1'), { target: { value: 'ręcznik się spłaszcza' } });
    await saveDraft();

    expect(sentDocument().therapist?.checkpoints?.[1]).toEqual({ text: 'ręcznik się spłaszcza', evidence: 'frame', view: 'closeup' });
    expect(withoutKeys(sentDocument(), ['therapist.checkpoints'])).toEqual(withoutKeys(document, ['therapist.checkpoints']));
  });

  it('usunięcie punktu kontrolnego usuwa właśnie ten wiersz', async () => {
    render(<Editor />);

    fireEvent.click(screen.getByTestId('exercise-detail-checkpoints-remove-0'));
    await saveDraft();

    expect(sentDocument().therapist?.checkpoints).toEqual(document.therapist?.checkpoints?.slice(1));
  });

  it('edycja sprzętu zachowuje code, a nowa pozycja trafia na koniec listy', async () => {
    render(<Editor />);

    fireEvent.change(screen.getByTestId('exercise-detail-equipment-items-label-1'), { target: { value: 'duży ręcznik' } });
    fireEvent.change(screen.getByTestId('exercise-detail-equipment-items-qty-1'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('exercise-detail-equipment-items-required-1'));
    fireEvent.change(screen.getByTestId('exercise-detail-equipment-subs-1-item-0'), { target: { value: 'koc' } });
    fireEvent.click(screen.getByTestId('exercise-detail-equipment-items-add-btn'));
    fireEvent.change(screen.getByTestId('exercise-detail-equipment-items-label-2'), { target: { value: 'krzesło' } });
    await saveDraft();

    expect(sentDocument().equipment_items).toEqual([
      document.equipment_items?.[0],
      { code: 'towel', label: 'duży ręcznik', qty: 2, required: false, substitutes: ['koc'] },
      { label: 'krzesło', qty: 1, required: true, substitutes: [] },
    ]);
    expect(withoutKeys(sentDocument(), ['equipment_items'])).toEqual(withoutKeys(document, ['equipment_items']));
  });

  it('uwagi kliniczne przyjmują najwyżej 600 znaków i pokazują licznik', async () => {
    render(<Editor />);
    const note = screen.getByTestId('exercise-detail-therapist-note-input');

    fireEvent.change(note, { target: { value: 'a'.repeat(700) } });

    expect((note as HTMLTextAreaElement).value).toHaveLength(600);
    expect(note).toHaveAttribute('maxlength', '600');
    expect(screen.getByTestId('exercise-detail-therapist-note-counter')).toHaveTextContent('600/600 znaków');
    await saveDraft();
    expect(sentDocument().therapist?.note).toHaveLength(600);
    expect(sentDocument().therapist?.checkpoints).toEqual(document.therapist?.checkpoints);
  });

  it('zapisuje łatwiej, trudniej, oddech i przeciwwskazania pod ścieżkami 3.3', async () => {
    render(<Editor />);

    fireEvent.change(screen.getByTestId('exercise-detail-easier-input'), { target: { value: 'Łatwiej.' } });
    fireEvent.change(screen.getByTestId('exercise-detail-harder-input'), { target: { value: 'Trudniej.' } });
    fireEvent.change(screen.getByTestId('exercise-detail-breathing-input'), { target: { value: 'Spokojny oddech.' } });
    fireEvent.change(screen.getByTestId('exercise-detail-contraindications-item-0'), { target: { value: 'Świeży uraz.' } });
    await saveDraft();

    expect(sentDocument().patient).toMatchObject({ easier: 'Łatwiej.', harder: 'Trudniej.' });
    expect(sentDocument().breathing).toEqual({ pattern: null, text: 'Spokojny oddech.' });
    expect(sentDocument().safety?.contraindications).toEqual([{ text: 'Świeży uraz.' }]);
    expect(sentDocument().therapist?.contraindications).toBeUndefined();
    expect(updateCore).not.toHaveBeenCalled();
  });
});

describe('ostrożności dla grup szczególnych w formularzu 3.3', () => {
  const precautions = [
    { group: 'ciaza', text: 'W ciąży po 20. tygodniu ćwicz w pozycji półleżącej.', source: 'S2' },
    { group: 'endoproteza_biodra', text: 'Po endoprotezie biodra nie krzyżuj nóg.' },
  ];
  const withPrecautions: ExerciseEditorSource = {
    ...v33Source,
    enrichmentData: { ...document, safety: { ...document.safety, precautions } } as ExerciseEnrichmentData,
  };
  const sentPrecautions = () => (sentDocument().safety as Record<string, unknown>).precautions;

  it('pokazuje zapisane zdania i dopisek o osobnym bloku dla pacjenta', () => {
    render(<Editor source={withPrecautions} />);

    expect(screen.getByText('Ostrożności dla grup szczególnych')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-precautions-item-0')).toHaveValue(precautions[0].text);
    expect(screen.getByTestId('exercise-detail-precautions-item-1')).toHaveValue(precautions[1].text);
    expect(
      screen.getByText('Pacjent zobaczy te zdania w osobnym bloku na końcu karty ćwiczenia, więc nie powtarzaj ich w krokach.')
    ).toBeInTheDocument();
  });

  it('edycja tekstu zachowuje kod grupy i dodatkowe klucze wiersza, reszta dokumentu bez zmian', async () => {
    render(<Editor source={withPrecautions} />);

    fireEvent.change(screen.getByTestId('exercise-detail-precautions-item-0'), { target: { value: 'W ciąży ćwicz półleżąc.' } });
    await saveDraft();

    expect(sentPrecautions()).toEqual([{ group: 'ciaza', text: 'W ciąży ćwicz półleżąc.', source: 'S2' }, precautions[1]]);
    expect(withoutKeys(sentDocument(), ['safety.precautions'])).toEqual(
      withoutKeys(withPrecautions.enrichmentData as ExerciseEnrichmentData, ['safety.precautions'])
    );
  });

  it('nowy wiersz dostaje kod grupy „other” z kontraktu §6.1, także pierwszy w rekordzie bez ostrożności', async () => {
    const { unmount } = render(<Editor source={withPrecautions} />);
    fireEvent.click(screen.getByTestId('exercise-detail-precautions-add-btn'));
    fireEvent.change(screen.getByTestId('exercise-detail-precautions-item-2'), { target: { value: 'Seniorzy: ćwicz przy oparciu.' } });
    await saveDraft();
    expect(sentPrecautions()).toEqual([...precautions, { group: 'other', text: 'Seniorzy: ćwicz przy oparciu.' }]);
    unmount();
    updateEnrichment.mockClear();

    render(<Editor />);
    fireEvent.change(screen.getByTestId('exercise-detail-precautions-item-0'), { target: { value: 'Przy zawrotach głowy ćwicz na siedząco.' } });
    await saveDraft();
    expect(sentPrecautions()).toEqual([{ group: 'other', text: 'Przy zawrotach głowy ćwicz na siedząco.' }]);
  });

  it('usunięcie wszystkich wierszy usuwa klucz z dokumentu', async () => {
    render(<Editor source={withPrecautions} />);

    fireEvent.click(screen.getByTestId('exercise-detail-precautions-remove-1'));
    fireEvent.click(screen.getByTestId('exercise-detail-precautions-remove-0'));
    await saveDraft();

    expect('precautions' in (sentDocument().safety as Record<string, unknown>)).toBe(false);
    expect(sentDocument().safety?.stop_if).toBe(document.safety?.stop_if);
  });

  it('rekord stary nie ma edytora ostrożności', () => {
    render(<Editor source={{ id: 'old', name: 'Stare', type: 'REPS', enrichmentData: { patient: { steps: ['Krok.'] } } }} />);

    expect(screen.queryByTestId('exercise-detail-precautions-item-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('exercise-detail-precautions-add-btn')).not.toBeInTheDocument();
  });
});

describe('AI i panel JSON w rekordzie 3.3', () => {
  const sourceWithGaps: ExerciseEditorSource = {
    ...v33Source,
    enrichmentData: { ...document, patient: { ...document.patient, why: '', when_to_do: undefined } },
  };

  beforeEach(() => {
    generateEnrichment.mockResolvedValue({
      success: true,
      enrichmentData: {
        patient: { steps: ['Krok AI, który nie zastąpi kroków.'], why: 'Po co, według AI.', when_to_do: 'Kiedy, według AI.' },
        safety: { stop_if: 'Nie zastąpi.', intensity_guide: 'Wysiłek 5/10.' },
        therapist: { clinical_notes: 'Notatka AI.', indications: ['Wskazanie AI'], contraindications: ['Przeciwwskazanie AI'] },
        ai: { problems: ['Problem AI'], keywords: ['słowo AI'] },
        equipment: ['mata AI'],
      },
    });
  });

  it('AI wypełnia tylko puste pola 3.3 i nie zapisuje pól wycofanych', async () => {
    render(<Editor source={sourceWithGaps} />);

    fireEvent.click(screen.getByTestId('exercise-editor-ai-fill-btn'));
    await screen.findByDisplayValue('Po co, według AI.');
    expect(generateEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({ patientDescription: document.patient?.summary, clinicalDescription: '' })
    );
    await saveDraft();

    const changed = ['patient.why', 'patient.when_to_do'];
    expect(sentDocument().patient).toMatchObject({ why: 'Po co, według AI.', when_to_do: 'Kiedy, według AI.' });
    expect(withoutKeys(sentDocument(), changed)).toEqual(withoutKeys(document, changed));
    expect(sentDocument().equipment).toBeUndefined();
    expect(sentDocument().therapist?.clinical_notes).toBeUndefined();
    expect(sentDocument().safety?.intensity_guide).toBeUndefined();
    expect(sentDocument().ai).toEqual(document.ai);
  });

  it('panel JSON odrzuca dokument bez schemaVersion i zostawia szkic bez zmian', async () => {
    render(<Editor />);

    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-trigger'));
    const textarea = await screen.findByTestId('exercise-editor-advanced-json-textarea');
    expect(JSON.parse((textarea as HTMLTextAreaElement).value)).toEqual(document);
    fireEvent.change(textarea, { target: { value: JSON.stringify({ patient: { summary: 'Bez wersji.' } }) } });
    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-apply-btn'));

    expect(await screen.findByTestId('exercise-editor-advanced-json-error')).toHaveTextContent('schemaVersion');
    expect(screen.getByTestId('exercise-detail-patient-summary-input')).toHaveValue(document.patient?.summary);
  });

  it('panel JSON z zachowaną wersją zmienia tylko pola edytowalne w formularzu', async () => {
    render(<Editor />);

    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-trigger'));
    const textarea = await screen.findByTestId('exercise-editor-advanced-json-textarea');
    const pasted = {
      ...document,
      patient: { ...document.patient, summary: 'Z panelu JSON.' },
      classification: { position: 'standing' },
      therapist: { ...document.therapist, clinical_notes: 'Pole wycofane.' },
    };
    fireEvent.change(textarea, { target: { value: JSON.stringify(pasted) } });
    fireEvent.click(screen.getByTestId('exercise-editor-advanced-json-apply-btn'));
    await waitFor(() => expect(screen.getByTestId('exercise-detail-patient-summary-input')).toHaveValue('Z panelu JSON.'));
    await saveDraft();

    expect(sentDocument().patient?.summary).toBe('Z panelu JSON.');
    expect(withoutKeys(sentDocument(), ['patient.summary'])).toEqual(withoutKeys(document, ['patient.summary']));
  });
});

describe('zapadka: pola formularza 3.3 a lista ścieżek zapisu', () => {
  function RecordingEditor({ seen }: Readonly<{ seen: Set<string> }>) {
    const form = useExerciseEditorForm({ source: v33Source, updateCore, updateEnrichment });
    const recording = {
      ...form,
      isPathDirty: (path: string) => {
        seen.add(path);
        return form.isPathDirty(path);
      },
      setEnrichmentPath: (path: string, value: unknown) => {
        seen.add(path);
        form.setEnrichmentPath(path, value);
      },
    };
    return (
      <TooltipProvider>
        <ExerciseEditor form={recording} />
      </TooltipProvider>
    );
  }

  it('każde pole treści formularza 3.3 pisze pod ścieżkę, którą zapis przyjmuje', () => {
    const seen = new Set<string>();
    render(<RecordingEditor seen={seen} />);
    fireEvent.change(screen.getByTestId('exercise-execution-steps-editor-item-0'), { target: { value: 'Zmieniony krok.' } });
    fireEvent.change(screen.getByTestId('exercise-audio-cues-editor-item-0'), { target: { value: 'Zmieniona wskazówka.' } });

    expect([...seen].filter((path) => !isV33EditablePath(path))).toEqual([]);
    // Lista pól formularza; `patient.step_images`, `patient.cue_phases` i `ai.keywords` edytuje centrum weryfikacji.
    expect([...seen].sort()).toEqual(
      V33_EDITABLE_PATHS.filter(
        (path) => !['patient.step_images', 'patient.cue_phases', 'ai.keywords'].includes(path)
      ).sort()
    );
  });

  it('hook w rekordzie 3.3 nie przyjmuje ścieżki spoza listy, w rekordzie starym przyjmuje jak dotąd', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderForm();
    act(() => result.current.setEnrichmentPath('classification.position', 'standing'));
    expect(result.current.enrichment).toEqual(document);
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();

    const legacy = renderForm({ id: 'old', name: 'Stare', type: 'REPS', enrichmentData: { patient: { steps: ['Krok.'] } } });
    act(() => legacy.result.current.setEnrichmentPath('ai.problems', ['ból']));
    expect(legacy.result.current.enrichment.ai?.problems).toEqual(['ból']);
    expect(legacy.result.current.isDirty).toBe(true);
  });
});
