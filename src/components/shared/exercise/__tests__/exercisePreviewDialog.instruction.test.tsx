import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fromBuilderExercise, fromExerciseMapping } from '../adapters';
import { ExercisePreviewDialog } from '../ExercisePreviewDialog';
import {
  emptyExercise,
  goldenV33Document,
  legacyStepsOnly,
  legacyWithDescription,
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

/** Cała sekcja „Instrukcja dla pacjenta” w podglądzie (pełna szerokość, sekcje jak w edycji). */
const instruction = () => screen.getByTestId('exercise-preview-instruction');
const stepTexts = () =>
  within(instruction())
    .queryAllByTestId(/^exercise-execution-step-\d+$/)
    .map((step) => step.textContent?.replace(/^\d+/, ''));
const overrideText = () => screen.queryByTestId('exercise-preview-instruction-override')?.querySelector('p.mt-1')?.textContent;
const NO_STEPS = 'Brak kroków wykonania dla tego ćwiczenia.';

describe('ExercisePreviewDialog: instrukcja dla pacjenta, rekord stary', () => {
  it('z opisem pokazuje opis z kolumny', () => {
    renderPreview(legacyWithDescription);
    expect(instruction()).toHaveTextContent('Stań prosto.');
    expect(instruction()).toHaveTextContent('Zrób przysiad.');
    expect(overrideText()).toBeUndefined();
  });

  it('opis pozycji wygrywa z kolumną, a personalizacja przypisania z opisem pozycji', () => {
    renderPreview(
      legacyWithDescription,
      { customDescription: 'Opis pozycji' },
      { patientDescription: 'Opis dla Jana' }
    );
    expect(overrideText()).toBe('Opis dla Jana');
    expect(instruction()).not.toHaveTextContent('Opis pozycji');
    expect(instruction()).not.toHaveTextContent('Stań prosto.');
  });

  it('bez opisu, ale z krokami pokazuje podsumowanie i każdy krok osobno', () => {
    renderPreview(legacyStepsOnly);
    expect(instruction()).toHaveTextContent('Przysiad do krzesła.');
    expect(stepTexts()).toEqual(['Stań przed krzesłem.', 'Usiądź i wstań.']);
  });

  it('bez żadnej treści mówi, że kroków brak', () => {
    renderPreview(emptyExercise);
    expect(instruction()).toHaveTextContent(NO_STEPS);
  });
});

describe('ExercisePreviewDialog: instrukcja dla pacjenta, rekord 3.3', () => {
  it('pokazuje podsumowanie i kroki, a nie starą kolumnę opisu', () => {
    renderPreview(v33WithStaleColumn);
    expect(stepTexts()).toEqual(goldenV33Document.patient?.steps);
    expect(instruction()).toHaveTextContent(goldenV33Document.patient?.summary ?? '');
    expect(screen.queryByText(/STARY OPIS Z KOLUMNY/)).toBeNull();
  });

  it('nadpisanie opisu stoi nad krokami', () => {
    renderPreview(v33WithStaleColumn, { customDescription: 'Opis pozycji' });
    expect(overrideText()).toBe('Opis pozycji');
    expect(stepTexts()).toEqual(goldenV33Document.patient?.steps);
  });

  it('bez kroków i podsumowania nie pokazuje wypełnionej kolumny', () => {
    renderPreview({ ...v33WithStaleColumn, enrichmentData: { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.3' } });
    expect(instruction()).toHaveTextContent(NO_STEPS);
    expect(screen.queryByText(/STARY OPIS Z KOLUMNY/)).toBeNull();
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
