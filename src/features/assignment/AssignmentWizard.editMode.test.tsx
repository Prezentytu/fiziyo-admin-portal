import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AssignmentWizard } from './AssignmentWizard';
import type { AssignmentEditInput, Patient } from './types';

const picker = vi.hoisted(() => ({ detailsPending: false }));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: undefined, loading: false, refetch: vi.fn() }),
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => ({ refetchQueries: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('./useAssignmentWizardTelemetry', () => ({
  useAssignmentWizardTelemetry: () => undefined,
  trackAssignmentWizardAbandon: vi.fn(),
  trackAssignmentWizardComplete: vi.fn(),
}));
vi.mock('@/hooks/useExercisePickerLibrary', () => ({
  useExercisePickerLibrary: () => ({
    exercises: [],
    library: { itemIds: [], popularIds: [], counts: { all: 0, organization: 0, fiziyo: 0 } },
    loadExercise: vi.fn(),
    detailsPending: picker.detailsPending,
    ensureDetailsReady: () => !picker.detailsPending,
  }),
}));
vi.mock('./CustomizeSetStep', () => ({ CustomizeSetStep: () => <div>krok-plan</div> }));
vi.mock('./SummaryStep', () => ({ SummaryStep: () => null }));
vi.mock('./ScheduleStep', () => ({ ScheduleStep: () => <div>krok-harmonogram</div> }));
vi.mock('@/features/exercises/ExerciseDialog', () => ({ ExerciseDialog: () => null }));
vi.mock('@/features/patients/PatientDialog', () => ({ PatientDialog: () => null }));

function patient(): Patient {
  return { id: 'patient-1', name: 'Anna Testowa' };
}

function assignment(): AssignmentEditInput {
  return {
    id: 'assignment-1',
    exerciseSetId: 'set-1',
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2026-12-01T00:00:00.000Z',
    notes: null,
    frequency: {
      timesPerDay: 1,
      breakBetweenSets: 60,
      monday: true,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: true,
      saturday: false,
      sunday: false,
    },
    exerciseSet: {
      id: 'set-1',
      name: 'Plan kolana',
      exerciseMappings: [{ id: 'mapping-1', exerciseId: 'exercise-1', order: 1, sets: 3, reps: 10 }],
    },
  } as AssignmentEditInput;
}

function renderWizard() {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    mode: 'from-patient' as const,
    organizationId: 'org-1',
    therapistId: 'therapist-1',
    editMode: true,
  };
  const view = render(<AssignmentWizard {...props} preselectedPatient={patient()} initialAssignment={assignment()} />);
  // The patient page builds both props inline, so every Apollo cache update hands the wizard new objects.
  const rerenderWithFreshProps = () =>
    view.rerender(<AssignmentWizard {...props} preselectedPatient={patient()} initialAssignment={assignment()} />);
  return { rerenderWithFreshProps };
}

describe('AssignmentWizard edit mode', () => {
  beforeEach(() => {
    picker.detailsPending = false;
    vi.mocked(toast.info).mockClear();
  });

  it('keeps the schedule step and the restart choice when the plan data re-renders', async () => {
    const user = userEvent.setup();
    const { rerenderWithFreshProps } = renderWizard();

    await user.click(screen.getByRole('button', { name: /Dalej/ }));
    await user.click(screen.getByRole('switch', { name: 'Rozpocznij plan od nowa' }));
    rerenderWithFreshProps();

    expect(screen.getByText('krok-harmonogram')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Rozpocznij plan od nowa' })).toBeChecked();
  });

  it('says what the save waits for instead of returning silently', async () => {
    picker.detailsPending = true;
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: /Dalej/ }));

    expect(screen.getByRole('status')).toHaveTextContent('Wczytujemy treść ćwiczeń z planu');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Wczytujemy treść ćwiczeń z planu'));
  });
});
