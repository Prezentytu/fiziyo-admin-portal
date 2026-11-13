import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { useExerciseEditorForm, type ExerciseEditorSource } from '../useExerciseEditorForm';

/**
 * Odbiór 12.11 (F3). Autozapis i zapis z przycisku albo decyzji mogły ruszyć naraz: drugi czytał z bazy
 * dokument zapisany przez pierwszy, porównywał go ze starym stanem bazowym i zgłaszał konflikt z samym sobą.
 * Zapisy jednego formularza idą po kolei, a każdy następny startuje od stanu po poprzednim.
 */

const document = fixture as ExerciseEnrichmentData;
const v33Source: ExerciseEditorSource = {
  id: 'fx-0073',
  name: 'Napinanie mięśnia czworogłowego',
  type: 'TIME',
  enrichmentData: document,
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Baza zapisuje od razu, a odpowiedź na zapis wraca dopiero po `release()`: tak wygląda zapis w locie. */
function slowServer(initial: ExerciseEnrichmentData) {
  let stored = clone(initial);
  const log: string[] = [];
  const pending: Array<() => void> = [];
  return {
    log,
    stored: () => stored,
    writes: [] as ExerciseEnrichmentData[],
    read: vi.fn(async () => {
      log.push('read');
      return clone(stored);
    }),
    write: vi.fn(function write(this: void, next: ExerciseEnrichmentData) {
      log.push('write:start');
      stored = clone(next);
      server.writes.push(stored);
      return new Promise<void>((resolve) => {
        pending.push(() => {
          log.push('write:end');
          resolve();
        });
      });
    }),
    release: async () => {
      await act(async () => {
        pending.shift()?.();
        await Promise.resolve();
      });
    },
    pendingCount: () => pending.length,
  };
}
let server: ReturnType<typeof slowServer>;

const updateCore = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  updateCore.mockResolvedValue(undefined);
});

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('kolejka zapisów formularza ćwiczenia', () => {
  it('rekord 3.3: drugi zapis czeka na pierwszy i nie zgłasza konfliktu z własnym zapisem', async () => {
    server = slowServer(document);
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useExerciseEditorForm({
        source: v33Source,
        updateCore,
        updateEnrichment: server.write,
        fetchCurrentEnrichment: server.read,
        onError,
      })
    );

    act(() => result.current.setEnrichmentPath('patient.why', 'Pierwsza zmiana.'));
    let first!: Promise<unknown>;
    act(() => {
      first = result.current.flush();
    });
    await settle();
    expect(server.log).toEqual(['read', 'write:start']);

    // Kolejna edycja i drugi zapis, zanim wróciła odpowiedź na pierwszy.
    act(() => result.current.setEnrichmentPath('patient.easier', 'Druga zmiana.'));
    let second!: Promise<unknown>;
    act(() => {
      second = result.current.flush();
    });
    await settle();
    expect(server.log).toEqual(['read', 'write:start']);

    await server.release();
    await settle();
    await server.release();
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(server.log).toEqual(['read', 'write:start', 'write:end', 'read', 'write:start', 'write:end']);
    expect(result.current.hasSaveConflict).toBe(false);
    expect(onError).not.toHaveBeenCalled();
    expect(server.writes).toHaveLength(2);
    expect(server.stored().patient).toMatchObject({ why: 'Pierwsza zmiana.', easier: 'Druga zmiana.' });
    expect(result.current.isDirty).toBe(false);
  });

  it('rekord 3.3: zapis w kolejce bez nowych zmian niczego nie wysyła', async () => {
    server = slowServer(document);
    const { result } = renderHook(() =>
      useExerciseEditorForm({
        source: v33Source,
        updateCore,
        updateEnrichment: server.write,
        fetchCurrentEnrichment: server.read,
      })
    );

    act(() => result.current.setEnrichmentPath('patient.why', 'Jedna zmiana.'));
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.flush();
      second = result.current.flush();
    });
    await settle();
    await server.release();
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(server.writes).toHaveLength(1);
    expect(server.read).toHaveBeenCalledTimes(1);
    expect(result.current.hasSaveConflict).toBe(false);
  });

  it('rekord bez wersji: edycja wpisana w trakcie zapisu idzie następnym zapisem, nie przepada', async () => {
    const legacy: ExerciseEnrichmentData = { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok.'] } };
    server = slowServer(legacy);
    const source: ExerciseEditorSource = { id: 'old', name: 'Stare', type: 'REPS', enrichmentData: legacy };
    const { result } = renderHook(() =>
      useExerciseEditorForm({
        source,
        updateCore,
        updateEnrichment: server.write,
      })
    );

    act(() => result.current.setEnrichmentPath('patient.summary', 'Pierwsza zmiana.'));
    let first!: Promise<unknown>;
    act(() => {
      first = result.current.flush();
    });
    await settle();
    act(() => result.current.setEnrichmentPath('patient.why', 'Wpisane w trakcie zapisu.'));
    let second!: Promise<unknown>;
    act(() => {
      second = result.current.flush();
    });
    await settle();
    expect(server.log).toEqual(['write:start']);

    await server.release();
    await settle();
    await server.release();
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(server.log).toEqual(['write:start', 'write:end', 'write:start', 'write:end']);
    expect(server.stored().patient).toMatchObject({ summary: 'Pierwsza zmiana.', why: 'Wpisane w trakcie zapisu.' });
    expect(result.current.isDirty).toBe(false);
  });
});
