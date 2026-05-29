import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubmitToOrganizationDialog } from '@/features/exercises/SubmitToOrganizationDialog';
import type { Exercise } from '@/features/exercises/ExerciseCard';

const baseExercise: Exercise = {
  id: 'exercise-1',
  name: 'Przysiad przy ścianie',
  scope: 'ORGANIZATION',
  status: 'DRAFT',
};

describe('SubmitToOrganizationDialog', () => {
  it('renderuje dialog z test id i opcją zgłoszenia mimo zaleceń', () => {
    render(
      <SubmitToOrganizationDialog
        open
        onOpenChange={() => {}}
        exercise={baseExercise}
        onConfirm={vi.fn(async () => {})}
      />
    );

    expect(screen.getByTestId('exercise-submit-to-org-dialog')).toBeInTheDocument();
    expect(screen.getByText('Zgłoś mimo zaleceń')).toBeInTheDocument();
  });

  it('pokazuje standardową akcję gdy sugestie są spełnione', () => {
    render(
      <SubmitToOrganizationDialog
        open
        onOpenChange={() => {}}
        exercise={{
          ...baseExercise,
          patientDescription: 'Opis pacjenta przekraczający wymagane minimum trzydziestu znaków.',
          imageUrl: 'https://example.com/image.jpg',
        }}
        onConfirm={vi.fn(async () => {})}
      />
    );

    expect(screen.getByText('Zgłoś do weryfikacji')).toBeInTheDocument();
  });
});
