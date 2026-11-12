import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { V33_EDITABLE_PATHS } from '@/components/shared/exercise/writeExerciseContent';

import { ExerciseEditor } from '../ExerciseEditor';
import {
  describeCollisionValue,
  ExerciseSaveConflictNotice,
  SAVE_COLLISION_FIELD_LABELS,
} from '../ExerciseSaveConflictNotice';
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

  describe('to samo pole zmienione przez obie osoby (odbiór 12.11, F2)', () => {
    async function collide() {
      const server = fakeServer();
      const editor = openEditor(server);
      act(() => editor.result.current.setEnrichmentPath('patient.why', 'Moje po co.'));
      act(() => editor.result.current.setEnrichmentPath('patient.easier', 'Moje łatwiej.'));
      await server.write({
        ...document,
        patient: { ...document.patient, why: 'Cudze po co.', harder: 'Cudze trudniej.' },
      });
      server.writes.length = 0;
      await act(async () => {
        await editor.result.current.save();
      });
      return { server, editor };
    }

    it('konflikt nazywa pole i obie wartości; pola zmienione tylko przez jedną osobę nie są kolizją', async () => {
      const { server, editor } = await collide();

      expect(server.writes).toHaveLength(0);
      expect(editor.result.current.hasSaveConflict).toBe(true);
      expect(editor.result.current.saveCollisions).toEqual([
        { path: 'patient.why', mine: 'Moje po co.', theirs: 'Cudze po co.' },
      ]);
    });

    it('bez wyboru wersji w polu kolizji nic się nie wczytuje i nic nie zapisuje', async () => {
      const { server, editor } = await collide();

      act(() => editor.result.current.loadCurrentVersion());
      act(() => editor.result.current.loadCurrentVersion({}));

      expect(editor.result.current.hasSaveConflict).toBe(true);
      await act(async () => {
        await editor.result.current.save();
      });
      expect(server.writes).toHaveLength(0);
      expect(server.stored().patient?.why).toBe('Cudze po co.');
    });

    it('wybór cudzej wersji: moja zmiana tego pola jest odrzucona, reszta moich zmian się zapisuje', async () => {
      const { server, editor } = await collide();

      act(() => editor.result.current.loadCurrentVersion({ 'patient.why': 'theirs' }));

      expect(editor.result.current.hasSaveConflict).toBe(false);
      expect(editor.result.current.enrichment.patient).toMatchObject({
        why: 'Cudze po co.',
        easier: 'Moje łatwiej.',
        harder: 'Cudze trudniej.',
      });
      expect(editor.result.current.isPathDirty('patient.why')).toBe(false);
      await act(async () => {
        await editor.result.current.save();
      });
      expect(server.stored().patient).toMatchObject({
        why: 'Cudze po co.',
        easier: 'Moje łatwiej.',
        harder: 'Cudze trudniej.',
      });
    });

    it('wybór mojej wersji: nadpisuje cudzą dopiero po tej decyzji', async () => {
      const { server, editor } = await collide();

      act(() => editor.result.current.loadCurrentVersion({ 'patient.why': 'mine' }));

      expect(editor.result.current.enrichment.patient?.why).toBe('Moje po co.');
      expect(server.stored().patient?.why).toBe('Cudze po co.');
      await act(async () => {
        await editor.result.current.save();
      });
      expect(server.stored().patient).toMatchObject({ why: 'Moje po co.', harder: 'Cudze trudniej.' });
    });
  });

  describe('listy zapisywane parami to jedna kolizja z jednym wyborem (odbiór 13.11, F10)', () => {
    const PAIRS = [
      {
        name: 'kroki i zdjęcia kroków',
        list: 'patient.steps',
        links: 'patient.step_images',
        mine: { list: ['Mój krok 1.', 'Mój krok 2.', 'Mój krok 3.'], links: [{ step: 1, url: 'https://example.test/moje.jpg' }] },
        theirs: { list: ['Cudzy krok 1.', 'Cudzy krok 2.'], links: [{ step: 2, url: 'https://example.test/cudze.jpg' }] },
      },
      {
        name: 'wskazówki i fazy wskazówek',
        list: 'patient.cues',
        links: 'patient.cue_phases',
        mine: { list: ['Moja wskazówka 1.', 'Moja wskazówka 2.'], links: [{ cue: 1, phase: 'rest' }] },
        theirs: { list: ['Cudza wskazówka.'], links: [{ cue: 0, phase: 'preparation' }] },
      },
    ] as const;
    type Pair = (typeof PAIRS)[number];

    const leaf = (path: string) => path.split('.')[1];
    const pairIn = (value: ExerciseEnrichmentData | undefined, pair: Pair) => {
      const patient = (value?.patient ?? {}) as Record<string, unknown>;
      return { list: patient[leaf(pair.list)], links: patient[leaf(pair.links)] };
    };

    /** Both people change both lists of the pair; I also change a field nobody else touched. */
    async function collidePair(pair: Pair) {
      const server = fakeServer();
      const editor = openEditor(server);
      act(() => editor.result.current.setEnrichmentPath(pair.list, [...pair.mine.list]));
      act(() => editor.result.current.setEnrichmentPath(pair.links, [...pair.mine.links]));
      act(() => editor.result.current.setEnrichmentPath('patient.easier', 'Moje łatwiej.'));
      await server.write({
        ...document,
        patient: { ...document.patient, [leaf(pair.list)]: pair.theirs.list, [leaf(pair.links)]: pair.theirs.links },
      } as ExerciseEnrichmentData);
      server.writes.length = 0;
      await act(async () => {
        await editor.result.current.save();
      });
      return { server, editor };
    }

    it.each(PAIRS)('$name: sprzeczny wybór w parze niczego nie wczytuje, moja treść zostaje na ekranie', async (pair) => {
      const { server, editor } = await collidePair(pair);

      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'mine', [pair.links]: 'theirs' }));
      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'theirs', [pair.links]: 'mine' }));

      expect(editor.result.current.hasSaveConflict).toBe(true);
      expect(pairIn(editor.result.current.enrichment, pair)).toEqual(pair.mine);
      await act(async () => {
        await editor.result.current.save();
      });
      expect(server.writes).toHaveLength(0);
      expect(pairIn(server.stored(), pair)).toEqual(pair.theirs);
    });

    it.each(PAIRS)('$name: wybór mojej wersji zapisuje obie moje listy', async (pair) => {
      const { server, editor } = await collidePair(pair);

      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'mine', [pair.links]: 'mine' }));
      await act(async () => {
        await editor.result.current.save();
      });

      expect(pairIn(server.stored(), pair)).toEqual(pair.mine);
      expect(server.stored().patient?.easier).toBe('Moje łatwiej.');
    });

    it.each(PAIRS)('$name: wybór wersji zapisanej zostawia obie cudze listy i resztę moich zmian', async (pair) => {
      const { server, editor } = await collidePair(pair);

      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'theirs', [pair.links]: 'theirs' }));
      expect(pairIn(editor.result.current.enrichment, pair)).toEqual(pair.theirs);
      await act(async () => {
        await editor.result.current.save();
      });

      expect(pairIn(server.stored(), pair)).toEqual(pair.theirs);
      expect(server.stored().patient?.easier).toBe('Moje łatwiej.');
    });

    it('kolizja w jednej liście pary pokazuje obie listy w obu wersjach, a „moja” nie miesza moich kroków z cudzymi zdjęciami', async () => {
      const pair = PAIRS[0];
      const server = fakeServer();
      const editor = openEditor(server);
      act(() => editor.result.current.setEnrichmentPath(pair.list, [...pair.mine.list]));
      await server.write({
        ...document,
        patient: { ...document.patient, steps: [...pair.theirs.list], step_images: [...pair.theirs.links] },
      });
      server.writes.length = 0;
      await act(async () => {
        await editor.result.current.save();
      });

      expect(editor.result.current.saveCollisions).toEqual([
        { path: pair.list, mine: pair.mine.list, theirs: pair.theirs.list },
        { path: pair.links, mine: undefined, theirs: pair.theirs.links },
      ]);
      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'mine', [pair.links]: 'mine' }));
      await act(async () => {
        await editor.result.current.save();
      });
      expect(server.stored().patient?.steps).toEqual(pair.mine.list);
      expect(server.stored().patient?.step_images ?? []).toEqual([]);
    });

    it('ja zmieniam kroki, tamta osoba zdjęcia kroków: to też kolizja pary, nic się nie skleja bez wyboru', async () => {
      const pair = PAIRS[0];
      const server = fakeServer();
      const editor = openEditor(server);
      act(() => editor.result.current.setEnrichmentPath(pair.list, ['Jedyny krok.']));
      await server.write({ ...document, patient: { ...document.patient, step_images: [...pair.theirs.links] } });
      server.writes.length = 0;
      await act(async () => {
        await editor.result.current.save();
      });

      expect(editor.result.current.saveCollisions.map(({ path }) => path)).toEqual([pair.list, pair.links]);
      act(() => editor.result.current.loadCurrentVersion());
      expect(editor.result.current.hasSaveConflict).toBe(true);
      expect(editor.result.current.enrichment.patient?.steps).toEqual(['Jedyny krok.']);

      act(() => editor.result.current.loadCurrentVersion({ [pair.list]: 'theirs', [pair.links]: 'theirs' }));
      expect(editor.result.current.enrichment.patient?.steps).toEqual(document.patient?.steps);
      expect(editor.result.current.enrichment.patient?.step_images).toEqual(pair.theirs.links);
    });

    it('komunikat daje dla pary jeden wybór, pokazuje obie wersje obu list i oddaje ten sam wybór dla obu', () => {
      const pair = PAIRS[0];
      const onLoadCurrent = vi.fn();
      render(
        <ExerciseSaveConflictNotice
          collisions={[
            { path: 'patient.why', mine: 'Moje po co.', theirs: 'Cudze po co.' },
            { path: pair.list, mine: pair.mine.list, theirs: pair.theirs.list },
            { path: pair.links, mine: pair.mine.links, theirs: pair.theirs.links },
          ]}
          onLoadCurrent={onLoadCurrent}
        />
      );

      expect(screen.getAllByTestId(/^exercise-save-conflict-keep-mine-/)).toHaveLength(2);
      expect(screen.queryByTestId('exercise-save-conflict-keep-mine-patient.step_images-btn')).not.toBeInTheDocument();
      const card = screen.getByTestId('exercise-save-conflict-collision-patient.steps');
      for (const text of ['Mój krok 3.', 'Cudzy krok 2.', 'https://example.test/moje.jpg', 'https://example.test/cudze.jpg']) {
        expect(card).toHaveTextContent(text);
      }

      fireEvent.click(screen.getByTestId('exercise-save-conflict-keep-theirs-patient.why-btn'));
      expect(screen.getByTestId('exercise-save-conflict-load-btn')).toBeDisabled();
      fireEvent.click(screen.getByTestId('exercise-save-conflict-keep-mine-patient.steps-btn'));
      fireEvent.click(screen.getByTestId('exercise-save-conflict-load-btn'));

      expect(onLoadCurrent).toHaveBeenCalledWith({
        'patient.why': 'theirs',
        'patient.steps': 'mine',
        'patient.step_images': 'mine',
      });
    });
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

  it('formularz przy kolizji tego samego pola pokazuje obie wersje i czeka na wybór', async () => {
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
    fireEvent.change(screen.getByTestId('exercise-detail-easier-input'), { target: { value: 'Moje łatwiej.' } });
    await server.write({ ...document, patient: { ...document.patient, easier: 'Cudze łatwiej.' } });
    server.writes.length = 0;

    fireEvent.click(screen.getByTestId('exercise-editor-test-save-btn'));
    const notice = await screen.findByTestId('exercise-save-conflict-notice');

    expect(notice).not.toHaveTextContent('żeby nie skasować tamtych');
    const collision = screen.getByTestId('exercise-save-conflict-collision-patient.easier');
    expect(collision).toHaveTextContent('Moje łatwiej.');
    expect(collision).toHaveTextContent('Cudze łatwiej.');
    expect(screen.getByTestId('exercise-save-conflict-load-btn')).toBeDisabled();

    fireEvent.click(screen.getByTestId('exercise-save-conflict-keep-theirs-patient.easier-btn'));
    expect(screen.getByTestId('exercise-save-conflict-load-btn')).toBeEnabled();
    fireEvent.click(screen.getByTestId('exercise-save-conflict-load-btn'));

    expect(screen.queryByTestId('exercise-save-conflict-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('exercise-detail-easier-input')).toHaveValue('Cudze łatwiej.');
    expect(server.writes).toHaveLength(0);
  });
});

describe('komunikat konfliktu: nazwy pól i wartości', () => {
  it('każde pole, które portal zapisuje, ma nazwę dla fizjoterapeuty', () => {
    expect(Object.keys(SAVE_COLLISION_FIELD_LABELS).sort()).toEqual([...V33_EDITABLE_PATHS].sort());
  });

  it('pokazuje tekst, listę, wiersze z kilkoma polami i pole opróżnione', () => {
    expect(describeCollisionValue('Zdanie.')).toEqual(['Zdanie.']);
    expect(describeCollisionValue(['Krok 1.', 'Krok 2.'])).toEqual(['Krok 1.', 'Krok 2.']);
    expect(describeCollisionValue([{ mistake: 'Błąd.', fix: 'Poprawka.' }])).toEqual(['Błąd. · Poprawka.']);
    expect(describeCollisionValue(true)).toEqual(['tak']);
    expect(describeCollisionValue(undefined)).toEqual(['(puste)']);
    expect(describeCollisionValue([])).toEqual(['(puste)']);
  });
});
