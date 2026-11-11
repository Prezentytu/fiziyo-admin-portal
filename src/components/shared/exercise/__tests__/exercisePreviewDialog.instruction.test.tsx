import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fromBuilderExercise, fromExerciseMapping } from '../adapters';
import { ExercisePreviewDialog } from '../ExercisePreviewDialog';
import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  LEGACY_STEPS_TEXT,
  legacyStepsOnly,
  legacyWithDescription,
  V33_STEPS_TEXT,
  v33WithStaleColumn,
} from './fixtures/instructionRecords';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

type Mapping = Parameters<typeof fromExerciseMapping>[0];
type Override = Parameters<typeof fromExerciseMapping>[1];

function renderPreview(exercise: Mapping['exercise'], mapping?: Partial<Mapping>, override?: Override) {
  const card = fromExerciseMapping(
    { id: 'm-1', exerciseId: exercise?.id ?? 'ex', sets: 3, reps: 10, exercise, ...mapping },
    override
  );
  render(<ExercisePreviewDialog open exercise={card} onOpenChange={() => {}} />);
}

/** Wartość pola „Opis dla pacjenta” w podglądzie. */
function patientInstructionText(): string | null {
  return (
    screen.getByText('Opis dla pacjenta').closest('div')?.parentElement?.querySelector('p.mt-1')?.textContent ?? null
  );
}

describe('ExercisePreviewDialog: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem pokazuje opis z kolumny', () => {
    renderPreview(legacyWithDescription);
    expect(patientInstructionText()).toBe(LEGACY_DESCRIPTION);
  });

  it('opis pozycji wygrywa z kolumną, a personalizacja przypisania z opisem pozycji', () => {
    renderPreview(
      legacyWithDescription,
      { customDescription: 'Opis pozycji' },
      { patientDescription: 'Opis dla Jana' }
    );
    expect(patientInstructionText()).toBe('Opis dla Jana');
  });

  it('bez opisu, ale z krokami pokazuje podsumowanie i kroki zamiast „Nie ustawiono”', () => {
    renderPreview(legacyStepsOnly);
    expect(patientInstructionText()).toBe(LEGACY_STEPS_TEXT);
  });

  it('bez żadnej treści mówi „Nie ustawiono”', () => {
    renderPreview(emptyExercise);
    expect(patientInstructionText()).toBe('Nie ustawiono');
  });
});

describe('ExercisePreviewDialog: instrukcja dla pacjenta, rekord 3.3', () => {
  it('pokazuje podsumowanie i kroki, a nie starą kolumnę opisu', () => {
    renderPreview(v33WithStaleColumn);
    expect(patientInstructionText()).toBe(V33_STEPS_TEXT);
  });

  it('nadpisanie opisu wygrywa z krokami', () => {
    renderPreview(v33WithStaleColumn, { customDescription: 'Opis pozycji' });
    expect(patientInstructionText()).toBe('Opis pozycji');
  });

  it('bez kroków i podsumowania mówi „Nie ustawiono” mimo wypełnionej kolumny', () => {
    renderPreview({ ...v33WithStaleColumn, enrichmentData: { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.3' } });
    expect(patientInstructionText()).toBe('Nie ustawiono');
  });

  it('kreator zestawu: opis zasiany z kolumny nie jest nadpisaniem, inny tekst jest', () => {
    const seeded = fromBuilderExercise(v33WithStaleColumn, {
      patientDescription: v33WithStaleColumn.patientDescription,
    });
    expect(seeded.patientDescriptionOverride).toBeUndefined();
    const edited = fromBuilderExercise(v33WithStaleColumn, { patientDescription: 'Opis dla Jana' });
    expect(edited.patientDescriptionOverride).toBe('Opis dla Jana');
  });
});
