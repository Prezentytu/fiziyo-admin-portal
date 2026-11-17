import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PatientAssignmentCard, type PatientAssignment } from '../PatientAssignmentCard';

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({ data: undefined, loading: false }),
  useApolloClient: () => ({ query: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

const assignment: PatientAssignment = {
  id: 'assignment-1',
  userId: 'patient-1',
  exerciseSetId: 'set-1',
  status: 'active',
  startDate: '2026-11-01T00:00:00.000Z',
  endDate: '2026-12-01T00:00:00.000Z',
  exerciseSet: {
    id: 'set-1',
    name: 'Plan kolana',
    exerciseMappings: [
      { id: 'mapping-1', exerciseId: 'exercise-1', order: 1, sets: 3, reps: 10, exercise: { id: 'exercise-1', name: 'Przysiad' } },
    ],
  } as PatientAssignment['exerciseSet'],
};

describe('PatientAssignmentCard: nazwy dostępne', () => {
  it('menu karty planu nazywa plan (data-testid znika w buildzie produkcyjnym)', () => {
    render(<PatientAssignmentCard assignment={assignment} patientId="patient-1" onEditPlan={() => {}} />);

    expect(screen.getByRole('button', { name: 'Więcej: Plan kolana' })).toBeInTheDocument();
  });

  it('ikony pozycji planu nazywają akcję i ćwiczenie', async () => {
    const user = userEvent.setup();
    render(<PatientAssignmentCard assignment={assignment} patientId="patient-1" onEditPlan={() => {}} />);

    await user.click(screen.getByText('Plan kolana'));

    for (const action of ['Podgląd', 'Edytuj parametry', 'Usuń z zestawu']) {
      expect(screen.getByRole('button', { name: `${action}: Przysiad` })).toBeInTheDocument();
    }
  });
});
