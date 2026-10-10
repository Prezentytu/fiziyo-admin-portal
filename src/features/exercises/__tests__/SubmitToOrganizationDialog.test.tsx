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
  it('D-M-033: długa nazwa nie rozpycha dialogu (kolumna grid może się zwęzić, nazwa się zawija)', () => {
    const longName = `E2E D-M-033 ${'Retrakcja i kontrolowane zgięcie szyi z utrzymaniem pozycji '.repeat(2)}`.trim();
    render(
      <SubmitToOrganizationDialog
        open
        onOpenChange={() => {}}
        exercise={{ ...baseExercise, name: longName }}
        onConfirm={vi.fn(async () => {})}
      />
    );

    // jsdom has no layout; DialogContent is a grid whose implicit `auto` track grows to the
    // unwrapped name width, so the track must be shrinkable and the name must wrap.
    expect(screen.getByTestId('exercise-submit-to-org-dialog')).toHaveClass('grid-cols-[minmax(0,1fr)]');
    const name = screen.getByText(longName);
    expect(name).not.toHaveClass('truncate');
    expect(name).not.toHaveClass('whitespace-nowrap');
    expect(name).toHaveClass('break-words');
  });
});
