import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubmitToGlobalDialog } from '@/features/exercises/SubmitToGlobalDialog';
import type { Exercise } from '@/features/exercises/ExerciseCard';

const baseExercise: Exercise = {
  id: 'exercise-1',
  name: 'Przysiad przy ścianie',
  scope: 'ORGANIZATION',
  status: 'DRAFT',
};

describe('SubmitToGlobalDialog', () => {
  it('pokazuje opcję zgłoszenia mimo zaleceń dla niekompletnego ćwiczenia', () => {
    render(
      <SubmitToGlobalDialog
        open
        onOpenChange={() => {}}
        exercise={baseExercise}
        onConfirm={vi.fn(async () => {})}
      />
    );

    expect(screen.getByText('Zgłoś mimo zaleceń')).toBeInTheDocument();
    expect(screen.getByText(/możesz zgłosić ćwiczenie już teraz/i)).toBeInTheDocument();
  });

  it('pokazuje standardową akcję gdy checklista jest kompletna', () => {
    render(
      <SubmitToGlobalDialog
        open
        onOpenChange={() => {}}
        exercise={{
          ...baseExercise,
          patientDescription: 'To jest długi opis pacjenta z odpowiednią liczbą znaków, aby przejść walidację.',
          clinicalDescription: 'Opis kliniczny dla fizjoterapeuty z dodatkowymi wskazówkami.',
          imageUrl: 'https://example.com/image.jpg',
          mainTags: ['nogi'],
          additionalTags: ['stabilizacja'],
        }}
        onConfirm={vi.fn(async () => {})}
      />
    );

    expect(screen.getByText('Zgłoś do weryfikacji')).toBeInTheDocument();
  });
});
