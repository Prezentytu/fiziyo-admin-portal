import { describe, expect, it, vi } from 'vitest';

vi.mock('../pdfImagePreloader', () => ({ preloadPdfImages: vi.fn() }));

import {
  emptyExercise,
  goldenV33Document,
  LEGACY_DESCRIPTION,
  LEGACY_STEPS_TEXT,
  legacyStepsOnly,
  legacyWithDescription,
  V33_STEPS_TEXT,
  v33WithStaleColumn,
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

  it('bez opisu, ale z krokami drukuje podsumowanie i kroki zamiast zdania ogólnego', () => {
    expect(toPdfExercise({ id: 'm-1', exercise: legacyStepsOnly }).description).toBe(LEGACY_STEPS_TEXT);
  });

  it('bez żadnej treści nie ma instrukcji', () => {
    expect(toPdfExercise({ id: 'm-1', exercise: emptyExercise }).description).toBeUndefined();
  });
});

describe('toPdfExercise: instrukcja dla pacjenta, rekord 3.3', () => {
  it('drukuje podsumowanie i ponumerowane kroki, a nie starą kolumnę opisu', () => {
    const description = toPdfExercise({ id: 'm-1', exercise: v33WithStaleColumn }).description;
    expect(description).toBe(V33_STEPS_TEXT);
    expect(description).not.toContain('STARY OPIS');
  });

  it('nadpisanie opisu wygrywa z krokami: personalizacja przypisania, potem opis pozycji', () => {
    const mapping = { id: 'm-1', customDescription: 'Opis pozycji', exercise: v33WithStaleColumn };
    expect(toPdfExercise(mapping).description).toBe('Opis pozycji');
    expect(toPdfExercise(mapping, { patientDescription: 'Opis dla Jana' }).description).toBe('Opis dla Jana');
  });

  it('kroki zmienione dla pacjenta trafiają na wydruk zamiast kroków szablonu', () => {
    const description = toPdfExercise(
      { id: 'm-1', exercise: v33WithStaleColumn },
      { enrichment: { patient: { steps: ['Tylko napnij udo.'] } } }
    ).description;
    expect(description).toBe(`${goldenV33Document.patient?.summary}\n1. Tylko napnij udo.`);
  });

  it('bez kroków i podsumowania nie ma instrukcji mimo wypełnionej kolumny', () => {
    const exercise = { ...v33WithStaleColumn, enrichmentData: { schemaVersion: '3.3' } };
    expect(toPdfExercise({ id: 'm-1', exercise }).description).toBeUndefined();
  });
});
