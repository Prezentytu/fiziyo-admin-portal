import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { ExerciseEditor } from '../ExerciseEditor';
import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

const { updateCore } = vi.hoisted(() => ({ updateCore: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/aiService', () => ({ aiService: { generateEnrichment: vi.fn() } }));

const document = fixture as ExerciseEnrichmentData;

const v33Source: ExerciseEditorSource = {
  id: 'fx-0073',
  name: 'Napinanie mięśnia czworogłowego',
  type: 'TIME',
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

beforeEach(() => {
  vi.clearAllMocks();
  updateCore.mockResolvedValue(undefined);
});

describe('ochrona przed nadpisaniem cudzej zmiany (rekord 3.3)', () => {
  /** The database column: holds one document, hands out copies. */
  function fakeServer(initial: ExerciseEnrichmentData = document) {
    let stored = JSON.parse(JSON.stringify(initial)) as ExerciseEnrichmentData;
    const writes: ExerciseEnrichmentData[] = [];
    return {
      read: vi.fn(async () => JSON.parse(JSON.stringify(stored)) as ExerciseEnrichmentData),
      write: vi.fn(async (next: ExerciseEnrichmentData) => {
        stored = JSON.parse(JSON.stringify(next)) as ExerciseEnrichmentData;
        writes.push(stored);
      }),
      stored: () => stored,
      writes,
    };
  }

  function openEditor(server: ReturnType<typeof fakeServer>, source: ExerciseEditorSource = v33Source) {
    const onError = vi.fn();
    const editor = renderHook(() =>
      useExerciseEditorForm({
        source,
        updateCore,
        updateEnrichment: server.write,
        fetchCurrentEnrichment: server.read,
        onError,
      })
    );
    return { ...editor, onError };
  }

  it('dwie równoległe edycje: druga nie nadpisuje pierwszej, a po wczytaniu aktualnej wersji zapisują się obie', async () => {
    const server = fakeServer();
    const first = openEditor(server);
    const second = openEditor(server);
    act(() => first.result.current.setEnrichmentPath('patient.easier', 'Łatwiej od pierwszej osoby.'));
    act(() => second.result.current.setEnrichmentPath('patient.harder', 'Trudniej od drugiej osoby.'));

    await act(async () => {
      await first.result.current.save();
    });
    await act(async () => {
      await second.result.current.save();
    });

    expect(server.writes).toHaveLength(1);
    expect(server.stored().patient?.easier).toBe('Łatwiej od pierwszej osoby.');
    expect(second.result.current.hasSaveConflict).toBe(true);
    expect(second.result.current.isDirty).toBe(true);
    expect(second.result.current.enrichment.patient?.harder).toBe('Trudniej od drugiej osoby.');
    expect(second.onError).not.toHaveBeenCalled();

    // Until the current version is loaded, another attempt must not write either.
    await act(async () => {
      await second.result.current.save();
    });
    expect(server.writes).toHaveLength(1);

    act(() => second.result.current.loadCurrentVersion());
    expect(second.result.current.hasSaveConflict).toBe(false);
    expect(second.result.current.enrichment.patient).toMatchObject({
      easier: 'Łatwiej od pierwszej osoby.',
      harder: 'Trudniej od drugiej osoby.',
    });
    await act(async () => {
      await second.result.current.save();
    });

    expect(server.writes).toHaveLength(2);
    expect(withoutKeys(server.stored(), ['patient.easier', 'patient.harder', '$schema'])).toEqual(
      withoutKeys(document, ['patient.easier', 'patient.harder', '$schema'])
    );
    expect(server.stored().patient).toMatchObject({
      easier: 'Łatwiej od pierwszej osoby.',
      harder: 'Trudniej od drugiej osoby.',
    });
  });

  it('cudza zmiana poza polami formularza (sekcja zespołu) też zatrzymuje zapis i przetrwa go', async () => {
    const server = fakeServer();
    const editor = openEditor(server);
    act(() => editor.result.current.setEnrichmentPath('patient.why', 'Nowe po co.'));
    await server.write({ ...document, lifecycle: { status: 'zmienione przez import' } } as ExerciseEnrichmentData);
    server.writes.length = 0;

    await act(async () => {
      await editor.result.current.save();
    });
    expect(server.writes).toHaveLength(0);
    expect(updateCore).not.toHaveBeenCalled();

    act(() => editor.result.current.loadCurrentVersion());
    await act(async () => {
      await editor.result.current.save();
    });
    expect(server.stored()).toMatchObject({ lifecycle: { status: 'zmienione przez import' }, patient: { why: 'Nowe po co.' } });
  });

  it('to samo pole zmienione przez obie osoby: po wczytaniu zostaje wersja z ekranu, zapis dopiero po decyzji', async () => {
    const server = fakeServer();
    const editor = openEditor(server);
    act(() => editor.result.current.setEnrichmentPath('patient.why', 'Moje po co.'));
    await server.write({ ...document, patient: { ...document.patient, why: 'Cudze po co.' } });

    await act(async () => {
      await editor.result.current.save();
    });
    expect(server.stored().patient?.why).toBe('Cudze po co.');

    act(() => editor.result.current.loadCurrentVersion());
    expect(editor.result.current.enrichment.patient?.why).toBe('Moje po co.');
    expect(editor.result.current.isPathDirty('patient.why')).toBe(true);
  });

  it('bez cudzej zmiany zapis przechodzi, także drugi z rzędu i przy innej kolejności kluczy w bazie', async () => {
    const server = fakeServer();
    const editor = openEditor(server);
    act(() => editor.result.current.setEnrichmentPath('patient.why', 'Raz.'));
    await act(async () => {
      await editor.result.current.save();
    });
    // JSONB does not keep key order.
    const reordered = Object.fromEntries(Object.entries(server.stored()).reverse()) as ExerciseEnrichmentData;
    await server.write(reordered);
    act(() => editor.result.current.setEnrichmentPath('patient.why', 'Dwa.'));
    await act(async () => {
      await editor.result.current.save();
    });

    expect(editor.result.current.hasSaveConflict).toBe(false);
    expect(server.stored().patient?.why).toBe('Dwa.');
  });

  it('gdy aktualnej wersji nie da się pobrać, zapis się nie wykonuje i zgłasza błąd', async () => {
    const server = fakeServer();
    server.read.mockRejectedValueOnce(new Error('sieć'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const editor = openEditor(server);
    act(() => editor.result.current.setEnrichmentPath('patient.why', 'Nowe.'));
    await act(async () => {
      await editor.result.current.save();
    });

    expect(server.writes).toHaveLength(0);
    expect(editor.result.current.saveStatus).toBe('error');
    expect(editor.result.current.hasSaveConflict).toBe(false);
    expect(editor.onError).toHaveBeenCalledTimes(1);

    // An empty answer is a failed read too: it must not become a "conflict" with an empty document.
    server.read.mockResolvedValueOnce(null as unknown as ExerciseEnrichmentData);
    await act(async () => {
      await editor.result.current.save();
    });
    errors.mockRestore();
    expect(server.writes).toHaveLength(0);
    expect(editor.result.current.hasSaveConflict).toBe(false);
    expect(editor.onError).toHaveBeenCalledTimes(2);
  });

  it('rekord stary zapisuje się jak dotąd, bez pobierania aktualnej wersji', async () => {
    const server = fakeServer({ patient: { steps: ['Krok.'] } });
    const editor = openEditor(server, { id: 'old', name: 'Stare', type: 'REPS', enrichmentData: { patient: { steps: ['Krok.'] } } });
    act(() => editor.result.current.setEnrichmentPath('patient.summary', 'Opis.'));
    await act(async () => {
      await editor.result.current.save();
    });

    expect(server.read).not.toHaveBeenCalled();
    expect(server.writes).toHaveLength(1);
  });

  it('formularz pokazuje konflikt i przycisk wczytania aktualnej wersji', async () => {
    const server = fakeServer();
    function ConflictEditor() {
      const form = useExerciseEditorForm({
        source: v33Source,
        updateCore,
        updateEnrichment: server.write,
        fetchCurrentEnrichment: server.read,
      });
      return (
        <TooltipProvider>
          <ExerciseEditor form={form} />
          <button type="button" data-testid="exercise-editor-test-save-btn" onClick={() => void form.save()}>
            Zapisz szkic
          </button>
        </TooltipProvider>
      );
    }
    render(<ConflictEditor />);
    expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('exercise-detail-easier-input'), { target: { value: 'Moje łatwiej.' } });
    await server.write({ ...document, patient: { ...document.patient, harder: 'Cudze trudniej.' } });
    server.writes.length = 0;

    fireEvent.click(screen.getByTestId('exercise-editor-test-save-btn'));
    await screen.findByTestId('exercise-save-conflict-notice');
    expect(server.writes).toHaveLength(0);

    fireEvent.click(screen.getByTestId('exercise-save-conflict-load-btn'));
    expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-easier-input')).toHaveValue('Moje łatwiej.');
    expect(screen.getByTestId('exercise-detail-harder-input')).toHaveValue('Cudze trudniej.');
  });
});
