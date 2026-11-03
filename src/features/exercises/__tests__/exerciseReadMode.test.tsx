import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SafetySection, TherapistSection } from '../ExerciseDetailSections';
import { ExerciseExecutionSteps } from '../ExerciseExecutionSteps';

describe('widok ćwiczenia w trybie odczytu', () => {
  it('pokazuje zdjęcie przypięte do kroku w weryfikacji', () => {
    render(
      <ExerciseExecutionSteps
        enrichmentData={{
          patient: {
            steps: ['Stań prosto', 'Zrób przysiad'],
            step_images: [{ step: 2, url: 'https://cdn.example.com/krok-2.jpg' }],
          },
        }}
      />
    );

    expect(screen.queryByTestId('exercise-execution-step-1-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('exercise-execution-step-2-image')).toHaveAttribute(
      'src',
      'https://cdn.example.com/krok-2.jpg'
    );
  });

  it('pokazuje objawy przerwania z liniami i nagłówkami, jak w aplikacji pacjenta', () => {
    const stopIf = 'Przerwij, jeśli pojawi się:\n- ostry ból kolana\n\nZadzwoń pod 112:\n- ból w klatce';
    render(
      <SafetySection data={{ safety: { stop_if: stopIf } }} editable={false} isPathDirty={() => false} setPath={vi.fn()} />
    );

    const text = within(screen.getByTestId('exercise-detail-stop-if-text')).getByText(/ostry ból kolana/);
    expect(text.textContent).toBe(stopIf);
    expect(text).toHaveClass('whitespace-pre-line');
  });

  it('pokazuje przeciwwskazania jako listę bez sklejania przecinkiem', () => {
    render(
      <TherapistSection
        data={{ therapist: { contraindications: ['Ból przy skoku obunóż.', 'Skurcz łydki'] } }}
        clinicalDescription=""
        editable={false}
        clinicalDescriptionDirty={false}
        onClinicalDescriptionChange={vi.fn()}
        setPath={vi.fn()}
        persist={async () => {}}
      />
    );

    expect(screen.getByText('Ból przy skoku obunóż.').tagName).toBe('LI');
    expect(screen.getByText('Skurcz łydki').tagName).toBe('LI');
  });
});
