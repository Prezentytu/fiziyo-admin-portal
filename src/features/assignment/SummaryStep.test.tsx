import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummaryStep } from './SummaryStep';
import type { ExerciseSet, Frequency, LocalExerciseMapping } from './types';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: null }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: null }),
}));

const mapping: LocalExerciseMapping = {
  id: 'mapping-1',
  exerciseId: 'exercise-1',
  sets: 4,
  reps: 10,
  customName: 'Rozciąganie mięśnia czworogłowego uda w staniu przy ścianie',
  exercise: {
    id: 'exercise-1',
    name: 'Rozciąganie',
    imageUrl: '/exercise.jpg',
    defaultSets: 3,
    defaultReps: 10,
  },
};

const exerciseSet: ExerciseSet = { id: 'set-1', name: 'Rozluźnianie', exerciseMappings: [mapping] };

const frequency: Frequency = {
  timesPerDay: 1,
  timesPerWeek: 3,
  isFlexible: true,
  breakBetweenSets: 0,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

describe('SummaryStep exercise list', () => {
  it('pokazuje pełną nazwę i parametry ćwiczenia zawijane w wąskiej kolumnie', () => {
    render(
      <SummaryStep
        exerciseSet={exerciseSet}
        localExercises={[mapping]}
        selectedPatients={[]}
        startDate={new Date('2026-11-02')}
        endDate={new Date('2026-11-30')}
        frequency={frequency}
        overrides={new Map()}
        excludedExercises={new Set()}
        saveAsTemplate={false}
        onSaveAsTemplateChange={() => {}}
        layout="aside"
      />
    );

    const name = screen.getByTestId('summary-exercise-mapping-1-name');
    expect(name).toHaveTextContent('Rozciąganie mięśnia czworogłowego uda w staniu przy ścianie');
    expect(name).not.toHaveClass('truncate');
    expect(screen.getByText(/4 serie/)).toBeInTheDocument();
    expect(screen.getByText(/10 powt\./)).toBeInTheDocument();
    // Wąska kolumna obok harmonogramu: lista bez własnego przewijania, podpowiedź zgłoszenia bez ucinania.
    expect(screen.getByTestId('summary-exercises-card')).not.toHaveClass('max-h-[320px]');
    expect(screen.getByTestId('summary-concierge-hint')).not.toHaveClass('truncate');
  });
});
