import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  buildChangedCoreVariables,
  useExerciseEditorForm,
  type ExerciseCoreDraft,
  type ExerciseEditorSource,
} from '../useExerciseEditorForm';

function makeDraft(overrides: Partial<ExerciseCoreDraft> = {}): ExerciseCoreDraft {
  return {
    name: 'Przysiad',
    patientDescription: 'Opis',
    clinicalDescription: '',
    notes: '',
    audioCue: '',
    tempo: '',
    rangeOfMotion: '',
    resistance: '',
    equipment: '',
    side: 'none',
    difficultyLevel: 'UNKNOWN',
    videoUrl: '',
    sets: 3,
    reps: 10,
    executionTime: null,
    restSets: 60,
    restReps: 0,
    preparationTime: 5,
    duration: null,
    loadKg: null,
    mainTags: ['tag-a', 'tag-b'],
    additionalTags: ['tag-c'],
    ...overrides,
  };
}

describe('buildChangedCoreVariables', () => {
  it('nie czyści tagów gdy edycja nie dotyczy tagów (passthrough)', () => {
    const initial = makeDraft();
    const current = makeDraft({ sets: 4 });
    const variables = buildChangedCoreVariables(initial, current);

    expect(variables.sets).toBe(4);
    expect(variables).not.toHaveProperty('mainTags');
    expect(variables).not.toHaveProperty('additionalTags');
  });

  it('wysyła mainTags/additionalTags tylko gdy się zmienią', () => {
    const initial = makeDraft();
    const current = makeDraft({ mainTags: ['tag-a'], additionalTags: [] });
    const variables = buildChangedCoreVariables(initial, current);

    expect(variables.mainTags).toEqual(['tag-a']);
    expect(variables.additionalTags).toEqual([]);
  });

  it('wysyła duration gdy zmienione', () => {
    const initial = makeDraft({ duration: null });
    const current = makeDraft({ duration: 60 });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.duration).toBe(60);
  });

  it('wysyła opór i sprzęt przycięte, a wyczyszczone jako pusty tekst (nie null = bez zmian)', () => {
    const changed = buildChangedCoreVariables(
      makeDraft(),
      makeDraft({ resistance: ' Średni ', equipment: 'Guma, krzesło' })
    );
    expect(changed.resistance).toBe('Średni');
    expect(changed.equipment).toBe('Guma, krzesło');

    const cleared = buildChangedCoreVariables(
      makeDraft({ resistance: 'Mocny', equipment: 'Hantel' }),
      makeDraft({ resistance: '', equipment: '' })
    );
    expect(cleared.resistance).toBe('');
    expect(cleared.equipment).toBe('');

    const untouched = buildChangedCoreVariables(makeDraft({ resistance: 'Mocny' }), makeDraft({ resistance: 'Mocny', sets: 4 }));
    expect(untouched).not.toHaveProperty('resistance');
  });

  it('mapuje difficultyLevel UNKNOWN na null', () => {
    const initial = makeDraft({ difficultyLevel: 'EASY' });
    const current = makeDraft({ difficultyLevel: 'UNKNOWN' });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.difficultyLevel).toBeNull();
  });

  it('wysyła exerciseSide none jako nazwę enumu, nie null', () => {
    const initial = makeDraft({ side: 'both' });
    const current = makeDraft({ side: 'none' });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.exerciseSide).toBe('none');
  });

  it('nie wysyła exerciseSide gdy strona się nie zmieniła', () => {
    const initial = makeDraft({ side: 'both' });
    const current = makeDraft({ side: 'both', sets: 4 });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables).not.toHaveProperty('exerciseSide');
    expect(variables.sets).toBe(4);
  });
});

describe('useExerciseEditorForm hydration', () => {
  const source: ExerciseEditorSource = {
    id: 'ex-1',
    name: 'Przysiad',
    defaultSets: 3,
    defaultReps: 10,
    defaultRestBetweenSets: 60,
  };

  it('zachowuje brudny draft po zmianie referencji source (refetch zdjęcia)', () => {
    const { result, rerender } = renderHook(
      ({ formSource }) =>
        useExerciseEditorForm({
          source: formSource,
          updateCore: async () => undefined,
          updateEnrichment: async () => undefined,
        }),
      { initialProps: { formSource: source } }
    );

    act(() => {
      result.current.setCoreField('restSets', 90);
    });
    expect(result.current.isDirty).toBe(true);

    rerender({ formSource: { ...source } });

    expect(result.current.core.restSets).toBe(90);
    expect(result.current.isDirty).toBe(true);
  });

  it('wczytuje nowe wartości source gdy formularz nie jest brudny', () => {
    const { result, rerender } = renderHook(
      ({ formSource }) =>
        useExerciseEditorForm({
          source: formSource,
          updateCore: async () => undefined,
          updateEnrichment: async () => undefined,
        }),
      { initialProps: { formSource: source } }
    );

    rerender({ formSource: { ...source, defaultRestBetweenSets: 45 } });

    expect(result.current.core.restSets).toBe(45);
    expect(result.current.isDirty).toBe(false);
  });
});

describe('useExerciseEditorForm: wersja rekordu', () => {
  const hook = (source: ExerciseEditorSource) =>
    renderHook(() =>
      useExerciseEditorForm({ source, updateCore: async () => {}, updateEnrichment: async () => {} })
    ).result.current;

  it('rekord 3.3 daje alternatingPerSide, rekord bez wersji nie', () => {
    expect(hook({ id: 'a', name: 'A', enrichmentData: { schemaVersion: '3.3' } } as ExerciseEditorSource).alternatingPerSide).toBe(true);
    expect(hook({ id: 'a', name: 'A', enrichmentData: {} } as ExerciseEditorSource).alternatingPerSide).toBe(false);
    expect(hook({ id: 'a', name: 'A', schemaVersion: '3.3-beta' } as ExerciseEditorSource).alternatingPerSide).toBe(false);
  });
});

/** Każda ścieżka do liścia dokumentu (klucze obiektów i indeksy list), z wartością. */
function leafPaths(value: unknown, prefix = ''): Map<string, unknown> {
  const paths = new Map<string, unknown>();
  const isContainer = value !== null && typeof value === 'object';
  const entries = isContainer ? Object.entries(value as Record<string, unknown>) : [];
  if (!isContainer || entries.length === 0) {
    paths.set(prefix, value);
    return paths;
  }
  for (const [key, entry] of entries) {
    for (const [path, leaf] of leafPaths(entry, prefix ? `${prefix}.${key}` : key)) paths.set(path, leaf);
  }
  return paths;
}

describe('useExerciseEditorForm: zapis nie gubi kluczy dokumentu', () => {
  // Rekord fx-0073 z różnymi wartościami wersji. Czytnik uzna część za starsze, ale dokument ma klucze 3.3
  // z pustymi wartościami (`[]`, `null`), których użytkownik nie dotknął.
  it.each([
    ['tekst "3.3"', '3.3'],
    ['liczba 3.3', 3.3],
    ['"3.3-beta"', '3.3-beta'],
    ['"v3.3"', 'v3.3'],
    ['bez wersji', undefined],
  ])('wersja %s: edycja jednego pola wysyła cały dokument', async (_label, schemaVersion) => {
    const { schemaVersion: _golden, ...rest } = structuredClone(goldenV33);
    const document = (schemaVersion === undefined ? rest : { ...rest, schemaVersion }) as ExerciseEnrichmentData;
    const updateEnrichment = vi.fn(async (_payload: ExerciseEnrichmentData) => undefined);
    const source: ExerciseEditorSource = { id: 'fx-0073', name: 'Most biodrowy', enrichmentData: document };
    const { result } = renderHook(() =>
      useExerciseEditorForm({ source, updateCore: async () => undefined, updateEnrichment })
    );

    await act(async () => {
      await result.current.save();
    });
    expect(updateEnrichment).not.toHaveBeenCalled();

    act(() => {
      result.current.setEnrichmentPath('patient.summary', 'Nowe podsumowanie.');
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateEnrichment).toHaveBeenCalledTimes(1);
    const sent = updateEnrichment.mock.calls[0][0];
    const sentPaths = leafPaths(sent);
    const lost = [...leafPaths(document).keys()].filter((path) => path !== 'patient.summary' && !sentPaths.has(path));
    expect(lost).toEqual([]);
    expect(sent.patient?.summary).toBe('Nowe podsumowanie.');
    expect((sent as Record<string, unknown>).schemaVersion).toBe(schemaVersion);
  });

  it('pole wyczyszczone przez użytkownika nie wraca z wczytanego dokumentu', async () => {
    const document = { ...structuredClone(goldenV33), schemaVersion: 3.3 } as unknown as ExerciseEnrichmentData;
    const updateEnrichment = vi.fn(async (_payload: ExerciseEnrichmentData) => undefined);
    const source: ExerciseEditorSource = { id: 'fx-0073', name: 'Most biodrowy', enrichmentData: document };
    const { result } = renderHook(() =>
      useExerciseEditorForm({ source, updateCore: async () => undefined, updateEnrichment })
    );

    act(() => {
      result.current.setEnrichmentPath('patient.why', '');
    });
    await act(async () => {
      await result.current.save();
    });

    const sent = updateEnrichment.mock.calls[0][0];
    expect(sent.patient).not.toHaveProperty('why');
    expect(sent.patient?.summary).toBe(document.patient?.summary);
  });

  // Po zapisie punktem odniesienia jest wysłany dokument, nie szkic: to, co pierwszy zapis wyciął (pusty krok,
  // wyczyszczone pole), nie wraca w następnym. Pacjent widziałby inaczej kroki „1. A, 3. C”.
  it('drugi zapis nie przywraca tego, co pierwszy wyciął', async () => {
    const document = {
      $schema: 'fiziyo-exercise-v3',
      patient: {
        summary: 'S',
        why: 'Po co',
        steps: ['A', 'B', 'C'],
        step_images: [
          { step: 1, url: 'uA' },
          { step: 3, url: 'uC' },
        ],
      },
    } as unknown as ExerciseEnrichmentData;
    const updateEnrichment = vi.fn(async (_payload: ExerciseEnrichmentData) => undefined);
    const updateCore = vi.fn(async (_variables: Record<string, unknown>) => undefined);
    const source: ExerciseEditorSource = { id: 'ex-kroki', name: 'Kroki', enrichmentData: document };
    const { result } = renderHook(() => useExerciseEditorForm({ source, updateCore, updateEnrichment }));
    const expectedPatient = {
      steps: ['A', 'C'],
      step_images: [
        { step: 1, url: 'uA' },
        { step: 2, url: 'uC' },
      ],
    };

    act(() => {
      result.current.setEnrichmentPath('patient.steps', ['A', '', 'C']);
      result.current.setEnrichmentPath('patient.why', '');
    });
    await act(async () => {
      await result.current.save();
    });
    // Zapis samego pola rdzenia między zapisami treści też nie cofa punktu odniesienia do szkicu.
    act(() => {
      result.current.setCoreField('sets', 5);
    });
    await act(async () => {
      await result.current.save();
    });
    act(() => {
      result.current.setEnrichmentPath('patient.summary', 'S2');
    });
    await act(async () => {
      await result.current.save();
    });

    expect(updateCore).toHaveBeenCalledTimes(1);
    expect(updateEnrichment).toHaveBeenCalledTimes(2);
    const [first, second] = updateEnrichment.mock.calls.map(([payload]) => payload.patient);
    expect(first).toEqual({ summary: 'S', ...expectedPatient });
    expect(second).toEqual({ summary: 'S2', ...expectedPatient });
  });
});
