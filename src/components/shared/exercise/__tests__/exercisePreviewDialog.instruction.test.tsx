import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fromExerciseMapping } from '../adapters';
import { ExercisePreviewDialog } from '../ExercisePreviewDialog';
import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  legacyStepsOnly,
  legacyWithDescription,
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
  return screen.getByText('Opis dla pacjenta').closest('div')?.parentElement?.querySelector('p.mt-1')?.textContent ?? null;
}

describe('ExercisePreviewDialog: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem pokazuje opis z kolumny', () => {
    renderPreview(legacyWithDescription);
    expect(patientInstructionText()).toBe(LEGACY_DESCRIPTION);
  });

  it('opis pozycji wygrywa z kolumną, a personalizacja przypisania z opisem pozycji', () => {
    renderPreview(legacyWithDescription, { customDescription: 'Opis pozycji' }, { patientDescription: 'Opis dla Jana' });
    expect(patientInstructionText()).toBe('Opis dla Jana');
  });

  it('bez opisu, ale z krokami: dziś „Nie ustawiono”', () => {
    renderPreview(legacyStepsOnly);
    expect(patientInstructionText()).toBe('Nie ustawiono');
  });

  it('bez żadnej treści mówi „Nie ustawiono”', () => {
    renderPreview(emptyExercise);
    expect(patientInstructionText()).toBe('Nie ustawiono');
  });
});
