import { describe, expect, it } from 'vitest';

import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  legacyStepsOnly,
  legacyWithDescription,
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

  it('bez opisu, ale z krokami: dziś „Brak opisu ćwiczenia.”', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(legacyStepsOnly));
    expect(viewModel.description).toBe('Brak opisu ćwiczenia.');
    expect(viewModel.patientDescription).toBeUndefined();
  });

  it('bez żadnej treści mówi „Brak opisu ćwiczenia.”', () => {
    const viewModel = buildExerciseDetailsViewModel(mappingOf(emptyExercise));
    expect(viewModel.description).toBe('Brak opisu ćwiczenia.');
    expect(viewModel.patientDescription).toBeUndefined();
  });
});
