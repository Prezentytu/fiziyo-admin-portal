import { describe, expect, it } from 'vitest';

import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  LEGACY_STEPS_TEXT,
  legacyStepsOnly,
  legacyWithDescription,
  V33_STEPS_TEXT,
  v33WithStaleColumn,
} from '@/components/shared/exercise/__tests__/fixtures/instructionRecords';
import { buildExerciseDetailsViewModel } from './exerciseDetailsViewModel';
import type { ExerciseMapping } from './types';

function mappingOf(exercise: ExerciseMapping['exercise'], overrides?: Partial<ExerciseMapping>): ExerciseMapping {
  return { id: 'm-1', exerciseId: exercise?.id ?? 'ex', sets: 3, reps: 10, exercise, ...overrides };
}

describe('buildExerciseDetailsViewModel: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem pokazuje opis z kolumny', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(legacyWithDescription));
    expect(viewModel.description).toBe(LEGACY_DESCRIPTION);
    expect(viewModel.patientDescription).toBe(LEGACY_DESCRIPTION);
  });

  it('opis pozycji zestawu wygrywa z kolumną', () => {
    const viewModel = buildExerciseDetailsViewModel(
      mappingOf(legacyWithDescription, { customDescription: ' Opis pozycji ' })
    );
    expect(viewModel.description).toBe('Opis pozycji');
  });

  it('bez opisu, ale z krokami pokazuje podsumowanie i kroki zamiast „Brak opisu ćwiczenia.”', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(legacyStepsOnly));
    expect(viewModel.description).toBe(LEGACY_STEPS_TEXT);
    expect(viewModel.patientDescription).toBe(LEGACY_STEPS_TEXT);
  });

  it('bez żadnej treści mówi „Brak opisu ćwiczenia.”', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(emptyExercise));
    expect(viewModel.description).toBe('Brak opisu ćwiczenia.');
    expect(viewModel.patientDescription).toBeUndefined();
  });
});

describe('buildExerciseDetailsViewModel: instrukcja dla pacjenta, rekord 3.3', () => {
  it('pokazuje podsumowanie i kroki, a nie starą kolumnę opisu', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(v33WithStaleColumn));
    expect(viewModel.description).toBe(V33_STEPS_TEXT);
    expect(viewModel.patientDescription).toBe(V33_STEPS_TEXT);
  });

  it('opis pozycji zestawu wygrywa z krokami', () => {
    const viewModel = buildExerciseDetailsViewModel(
      mappingOf(v33WithStaleColumn, { customDescription: 'Opis pozycji' })
    );
    expect(viewModel.description).toBe('Opis pozycji');
  });

  it('kroki zmienione w pozycji zestawu wygrywają z krokami szablonu', () => {
    const viewModel = buildExerciseDetailsViewModel(
      mappingOf(v33WithStaleColumn, { overridesJson: '{"enrichment":{"patient":{"steps":["Tylko napnij udo."]}}}' })
    );
    expect(viewModel.description.split('\n').slice(1)).toEqual(['1. Tylko napnij udo.']);
  });

  it('bez kroków i podsumowania mówi „Brak opisu ćwiczenia.” mimo wypełnionej kolumny', () => {
    const viewModel = buildExerciseDetailsViewModel(
      mappingOf({ ...v33WithStaleColumn, enrichmentData: { schemaVersion: '3.3' } })
    );
    expect(viewModel.description).toBe('Brak opisu ćwiczenia.');
    expect(viewModel.patientDescription).toBeUndefined();
  });
});
