import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  emptyExercise,
  LEGACY_DESCRIPTION,
  LEGACY_STEPS_TEXT,
  legacyStepsOnly,
  legacyWithDescription,
  V33_STEPS_TEXT,
  v33WithStaleColumn,
} from '@/components/shared/exercise/__tests__/fixtures/instructionRecords';
import { ExercisePreviewDrawer } from '../ExercisePreviewDrawer';
import type { ExerciseMapping, ExerciseOverride } from '../PatientAssignmentCard';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

function renderDrawer(
  exercise: ExerciseMapping['exercise'],
  mapping?: Partial<ExerciseMapping>,
  override?: ExerciseOverride
) {
  render(
    <ExercisePreviewDrawer
      open
      onOpenChange={() => {}}
      mapping={{ id: 'm-1', exerciseId: exercise?.id ?? 'ex', sets: 3, reps: 10, exercise, ...mapping }}
      override={override}
    />
  );
}

/** Tekst akapitu pod nagłówkiem „Opis dla pacjenta”; `null`, gdy sekcji nie ma. */
function patientInstructionText(): string | null {
  const heading = screen.queryByText('Opis dla pacjenta');
  return heading ? (heading.nextElementSibling?.textContent ?? null) : null;
}

describe('ExercisePreviewDrawer: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem pokazuje opis z kolumny', () => {
    renderDrawer(legacyWithDescription);
    expect(patientInstructionText()).toBe(LEGACY_DESCRIPTION);
  });

  it('opis pozycji zestawu wygrywa z kolumną', () => {
    renderDrawer(legacyWithDescription, { customDescription: 'Opis pozycji' });
    expect(patientInstructionText()).toBe('Opis pozycji');
  });

  it('opis z przypisania wygrywa z opisem pozycji', () => {
    renderDrawer(legacyWithDescription, { customDescription: 'Opis pozycji' }, {
      exerciseMappingId: 'm-1',
      customDescription: 'Opis dla Jana',
    } as ExerciseOverride);
    expect(patientInstructionText()).toBe('Opis dla Jana');
  });

  it('bez opisu, ale z krokami pokazuje podsumowanie i kroki zamiast chować sekcję', () => {
    renderDrawer(legacyStepsOnly);
    expect(patientInstructionText()).toBe(LEGACY_STEPS_TEXT);
  });

  it('puste nadpisanie opisu nie chowa opisu z kolumny', () => {
    renderDrawer(legacyWithDescription, { customDescription: '' });
    expect(patientInstructionText()).toBe(LEGACY_DESCRIPTION);
  });

  it('bez żadnej treści sekcji opisu nie ma', () => {
    renderDrawer(emptyExercise);
    expect(patientInstructionText()).toBeNull();
  });
});

describe('ExercisePreviewDrawer: instrukcja dla pacjenta, rekord 3.3', () => {
  it('pokazuje podsumowanie i kroki, a nie starą kolumnę opisu', () => {
    renderDrawer(v33WithStaleColumn);
    expect(patientInstructionText()).toBe(V33_STEPS_TEXT);
  });

  it('opis z przypisania wygrywa z krokami', () => {
    renderDrawer(v33WithStaleColumn, undefined, {
      exerciseMappingId: 'm-1',
      customDescription: 'Opis dla Jana',
    } as ExerciseOverride);
    expect(patientInstructionText()).toBe('Opis dla Jana');
  });

  it('bez kroków i podsumowania sekcji opisu nie ma mimo wypełnionej kolumny', () => {
    renderDrawer({ ...v33WithStaleColumn, enrichmentData: { schemaVersion: '3.3' } });
    expect(patientInstructionText()).toBeNull();
  });
});
