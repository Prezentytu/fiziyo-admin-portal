import { describe, expect, it, vi } from 'vitest';

vi.mock('../pdfImagePreloader', () => ({ preloadPdfImages: vi.fn() }));

import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  legacyStepsOnly,
  legacyWithDescription,
} from '@/components/shared/exercise/__tests__/fixtures/instructionRecords';
import { toPdfExercise } from '../pdfExerciseUtils';

describe('toPdfExercise: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem drukuje opis z kolumny, z pustymi liniami', () => {
    expect(toPdfExercise({ id: 'm-1', exercise: legacyWithDescription }).description).toBe(LEGACY_DESCRIPTION);
  });

  it('opis pozycji zestawu wygrywa z kolumną, a personalizacja przypisania z opisem pozycji', () => {
    const mapping = { id: 'm-1', customDescription: 'Opis pozycji', exercise: legacyWithDescription };
    expect(toPdfExercise(mapping).description).toBe('Opis pozycji');
    expect(toPdfExercise(mapping, { patientDescription: 'Opis dla Jana' }).description).toBe('Opis dla Jana');
  });

  it('bez opisu, ale z krokami: dziś brak instrukcji (wydruk dostaje zdanie ogólne)', () => {
    expect(toPdfExercise({ id: 'm-1', exercise: legacyStepsOnly }).description).toBeUndefined();
  });

  it('bez żadnej treści nie ma instrukcji', () => {
    expect(toPdfExercise({ id: 'm-1', exercise: emptyExercise }).description).toBeUndefined();
  });
});
