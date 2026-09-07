import type { ComponentProps } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import type { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import type { PatientDialog } from '@/features/patients/PatientDialog';
import type { SetThumbnail } from '@/features/exercise-sets/SetThumbnail';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { DashboardHomePage } from './DashboardHomePage';

interface PatientFixture {
  assignmentId: string;
  assignedAt: string;
  lastActivity?: string;
  patient: { id: string; fullname: string; image?: string; isShadowUser?: boolean };
}

interface SetFixture {
  id: string;
  name: string;
  creationTime: string;
  kind?: 'TEMPLATE' | 'PATIENT_PLAN';
  isTemplate?: boolean;
  frequency?: { timesPerDay: string; timesPerWeek: string; monday: boolean };
  exerciseMappings: Array<{
    id: string;
    exerciseId: string;
    exercise: { id: string; name: string; imageUrl: string; images: string[] };
  }>;
}

const state = vi.hoisted(() => ({
  organizationId: 'organization-1' as string | undefined,
  therapistId: 'therapist-1' as string | undefined,
  canViewBilling: true,
  userLoading: false,
  patientsLoading: false,
  setsLoading: false,
  patients: [] as PatientFixture[],
  sets: [] as SetFixture[],
  assignmentRender: vi.fn(),
  createSetRender: vi.fn(),
  patientRender: vi.fn(),
  thumbnailRender: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { firstName: 'Anna' } }) }));
vi.mock('@/contexts/CurrentUserContext', () => ({
  useCurrentUser: () => ({ user: { id: state.therapistId, fullname: 'Anna Nowak' }, isLoading: state.userLoading }),
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: state.organizationId } }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canViewBilling: state.canViewBilling }) }));
vi.mock('@/hooks/useRealtimePatients', () => ({ useRealtimePatients: vi.fn() }));
vi.mock('@/hooks/useRealtimeExerciseSets', () => ({ useRealtimeExerciseSets: vi.fn() }));
vi.mock('@apollo/client/react', () => ({
  useQuery: (query: unknown) => {
    if (query === GET_ORGANIZATION_EXERCISE_SETS_QUERY) {
      return { data: { exerciseSets: state.sets }, loading: state.setsLoading };
    }
    if (query === GET_ORGANIZATION_PATIENTS_QUERY) {
      return { data: { organizationPatients: state.patients }, loading: state.patientsLoading };
    }
    if (query === GET_THERAPIST_EXERCISE_ASSIGNMENTS_QUERY) {
      return { data: { patientAssignments: [] }, loading: false };
    }
    throw new Error('Unexpected dashboard query');
  },
}));
vi.mock('@/components/onboarding/GettingStartedCard', () => ({ GettingStartedCard: () => null }));
vi.mock('@/components/shared/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="test-dashboard-skeleton" />,
}));
vi.mock('@/components/billing', () => ({
  BillingStatusBar: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="test-billing-status" data-organization-id={organizationId} />
  ),
}));
vi.mock('@/features/exercise-sets/SetThumbnail', () => ({
  SetThumbnail: (props: ComponentProps<typeof SetThumbnail>) => {
    state.thumbnailRender(props);
    return <div data-testid="test-set-thumbnail" />;
  },
}));
vi.mock('@/features/assignment/AssignmentWizard', () => ({
  AssignmentWizard: (props: ComponentProps<typeof AssignmentWizard>) => {
    state.assignmentRender(props);
    return props.open ? (
      <div role="dialog" aria-label="Przypisanie zestawu">
        <button data-testid="test-assignment-close" onClick={() => props.onOpenChange(false)}>
          Zamknij
        </button>
        <button data-testid="test-assignment-success" onClick={() => props.onSuccess?.()}>
          Zakończ
        </button>
      </div>
    ) : null;
  },
}));
vi.mock('@/features/exercise-sets/CreateSetWizard', () => ({
  CreateSetWizard: (props: ComponentProps<typeof CreateSetWizard>) => {
    state.createSetRender(props);
    return props.open ? (
      <div role="dialog" aria-label="Tworzenie zestawu">
        <button data-testid="test-create-set-close" onClick={() => props.onOpenChange(false)}>
          Zamknij
        </button>
      </div>
    ) : null;
  },
}));
vi.mock('@/features/patients/PatientDialog', () => ({
  PatientDialog: (props: ComponentProps<typeof PatientDialog>) => {
    state.patientRender(props);
    return props.open ? (
      <div role="dialog" aria-label="Nowy pacjent">
        <button data-testid="test-patient-close" onClick={() => props.onOpenChange(false)}>
          Zamknij
        </button>
      </div>
    ) : null;
  },
}));

function patientFixture(id: string, lastActivity?: string, isShadowUser = false): PatientFixture {
  return {
    assignmentId: `assignment-${id}`,
    assignedAt: '2026-09-01T10:00:00Z',
    lastActivity,
    patient: { id, fullname: `Pacjent ${id}`, image: `/images/${id}.jpg`, isShadowUser },
  };
}

function setFixture(id: string, kind: SetFixture['kind'] = 'TEMPLATE'): SetFixture {
  return {
    id,
    name: `Zestaw ${id}`,
    kind,
    creationTime: '2026-09-01T10:00:00Z',
    frequency: { timesPerDay: '2', timesPerWeek: '3', monday: true },
    exerciseMappings: [
      {
        id: `mapping-${id}`,
        exerciseId: `exercise-${id}`,
        exercise: { id: `exercise-${id}`, name: 'Ruch ramienia', imageUrl: '/images/exercise.jpg', images: [] },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-07T10:00:00Z'));
  state.organizationId = 'organization-1';
  state.therapistId = 'therapist-1';
  state.canViewBilling = true;
  state.userLoading = false;
  state.patientsLoading = false;
  state.setsLoading = false;
  state.patients = [];
  state.sets = [];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DashboardHomePage', () => {
  it('keeps the header, section landmarks, navigation IDs and empty-state actions', async () => {
    const user = userEvent.setup();
    render(<DashboardHomePage />);

    expect(screen.getByTestId('dashboard-greeting')).toHaveTextContent('Anna Nowak');
    expect(screen.getByRole('region', { name: 'Pacjenci do sprawdzenia' })).toHaveAttribute(
      'data-testid',
      'dashboard-activity-section'
    );
    expect(screen.getByRole('region', { name: 'Szybki wybór' })).toHaveAttribute(
      'data-testid',
      'dashboard-sets-section'
    );
    expect(screen.getByTestId('dashboard-patients-view-all')).toHaveAttribute('href', '/patients');
    expect(screen.getByTestId('dashboard-sets-view-all')).toHaveAttribute('href', '/exercise-sets');
    expect(screen.getByTestId('page-button-487')).toHaveTextContent('Wszyscy (0)');
    expect(screen.getByTestId('page-button-636')).toHaveTextContent('Wszystkie');
    expect(screen.getByText('Brak przypisanych pacjentów')).toBeInTheDocument();
    expect(screen.getByText('Brak zestawów do szybkiego wyboru')).toBeInTheDocument();
    expect(document.querySelector('a button')).toBeNull();

    await user.click(screen.getByTestId('common-dashboard-home-page-btn-606'));
    expect(screen.getByRole('dialog', { name: 'Nowy pacjent' })).toBeInTheDocument();
    await user.click(screen.getByTestId('test-patient-close'));
    await user.click(screen.getByTestId('page-button-712'));
    expect(screen.getByRole('dialog', { name: 'Tworzenie zestawu' })).toBeInTheDocument();
  });

  it('opens all toolbar actions with the existing organization, therapist and assignment mode', async () => {
    const user = userEvent.setup();
    render(<DashboardHomePage />);

    const primaryAction = screen.getByTestId('dashboard-hero-assign-set-btn');
    primaryAction.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Przypisanie zestawu' })).toBeInTheDocument();
    expect(state.assignmentRender).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        mode: 'from-patient',
        organizationId: 'organization-1',
        therapistId: 'therapist-1',
        preselectedSet: undefined,
      })
    );
    await user.click(screen.getByTestId('test-assignment-close'));

    await user.click(screen.getByTestId('dashboard-add-patient-btn'));
    expect(screen.getByRole('dialog', { name: 'Nowy pacjent' })).toBeInTheDocument();
    expect(state.patientRender).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        organizationId: 'organization-1',
        therapistId: 'therapist-1',
      })
    );
    await user.click(screen.getByTestId('test-patient-close'));

    await user.click(screen.getByTestId('dashboard-create-set-btn'));
    expect(screen.getByRole('dialog', { name: 'Tworzenie zestawu' })).toBeInTheDocument();
    expect(state.createSetRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true, organizationId: 'organization-1' })
    );
  });

  it('preserves patient status text, priority order and patient navigation', () => {
    state.patients = [
      patientFixture('active', '2026-09-07T08:00:00Z'),
      patientFixture('inactive', '2026-09-02T10:00:00Z'),
      patientFixture('warning', '2026-09-05T10:00:00Z'),
      patientFixture('new', undefined, true),
    ];
    render(<DashboardHomePage />);

    const activitySection = screen.getByTestId('dashboard-activity-section');
    const patientRows = within(activitySection).getAllByTestId(/^dashboard-patient-item-/);
    expect(patientRows.map((row) => row.getAttribute('href'))).toEqual([
      '/patients/new',
      '/patients/warning',
      '/patients/inactive',
      '/patients/active',
    ]);
    expect(screen.getByTestId('dashboard-patient-item-new')).toHaveTextContent('Brak aktywności');
    expect(screen.getByTestId('dashboard-patient-item-warning')).toHaveTextContent('Nieaktywny od 2 dni');
    expect(screen.getByTestId('dashboard-patient-item-inactive')).toHaveTextContent('Nieaktywny od 5 dni');
    expect(screen.getByTestId('dashboard-patient-item-active')).toHaveTextContent('Ćwiczył 2 godz. temu');
    expect(screen.getByText('Sprawdź, co u 3 pacjentów')).toBeInTheDocument();
    expect(screen.getByTestId('page-button-487')).toHaveTextContent('Wszyscy (4)');
  });

  it.each(['close', 'success'])(
    'keeps quick set choices, media and from-set mode, then clears selection on %s',
    async (action) => {
      const user = userEvent.setup();
      const template = setFixture('template');
      const legacyTemplate = { ...setFixture('legacy'), kind: undefined, isTemplate: true };
      state.sets = [template, setFixture('personalized', 'PATIENT_PLAN'), legacyTemplate];
      render(<DashboardHomePage />);

      expect(screen.getByTestId('dashboard-set-item-template')).toHaveAttribute('href', '/exercise-sets/template');
      expect(screen.getByTestId('dashboard-set-item-legacy')).toHaveAttribute('href', '/exercise-sets/legacy');
      expect(screen.queryByTestId('dashboard-set-item-personalized')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-set-item-template')).toHaveTextContent('1 ćw.');
      expect(state.thumbnailRender).toHaveBeenCalledWith(
        expect.objectContaining({ exerciseMappings: template.exerciseMappings })
      );

      const quickAction = screen.getByTestId('dashboard-quick-assign-template');
      expect(quickAction).toHaveAccessibleName('Personalizuj i przypisz Zestaw template');
      quickAction.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog', { name: 'Przypisanie zestawu' })).toBeInTheDocument();
      expect(state.assignmentRender).toHaveBeenLastCalledWith(
        expect.objectContaining({
          open: true,
          mode: 'from-set',
          organizationId: 'organization-1',
          therapistId: 'therapist-1',
          preselectedSet: expect.objectContaining({
            id: template.id,
            name: template.name,
            exerciseMappings: template.exerciseMappings,
            frequency: expect.objectContaining({ timesPerDay: 2, timesPerWeek: 3, monday: true }),
          }),
        })
      );

      await user.click(screen.getByTestId(`test-assignment-${action}`));
      expect(screen.queryByRole('dialog', { name: 'Przypisanie zestawu' })).not.toBeInTheDocument();
      await user.click(screen.getByTestId('dashboard-hero-assign-set-btn'));
      expect(state.assignmentRender).toHaveBeenLastCalledWith(
        expect.objectContaining({
          open: true,
          mode: 'from-patient',
          preselectedSet: undefined,
        })
      );
    }
  );

  it('preserves disabled actions when no therapist is available', () => {
    state.therapistId = undefined;
    state.sets = [setFixture('template')];
    render(<DashboardHomePage />);

    expect(screen.getByTestId('dashboard-hero-assign-set-btn')).toBeDisabled();
    expect(screen.getByTestId('dashboard-add-patient-btn')).toBeDisabled();
    expect(screen.getByTestId('common-dashboard-home-page-btn-606')).toBeDisabled();
    expect(screen.getByTestId('dashboard-quick-assign-template')).toBeDisabled();
    expect(screen.getByTestId('dashboard-create-set-btn')).toBeEnabled();
    expect(state.assignmentRender).not.toHaveBeenCalled();
    expect(state.patientRender).not.toHaveBeenCalled();
  });

  it('keeps billing scoped to the organization and hidden without billing access', () => {
    const { rerender } = render(<DashboardHomePage />);
    expect(screen.getByTestId('test-billing-status')).toHaveAttribute('data-organization-id', 'organization-1');

    state.canViewBilling = false;
    rerender(<DashboardHomePage />);
    expect(screen.queryByTestId('test-billing-status')).not.toBeInTheDocument();
  });

  it('does not show empty actions while patient and set data is loading', () => {
    state.patientsLoading = true;
    state.setsLoading = true;
    render(<DashboardHomePage />);

    expect(screen.queryByTestId('common-dashboard-home-page-btn-606')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-button-712')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-activity-section')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sets-section')).toBeInTheDocument();
  });

  it('retains the initial loading boundary when organization context is absent', () => {
    state.organizationId = undefined;
    render(<DashboardHomePage />);

    expect(screen.getByTestId('test-dashboard-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-hero-assign-set-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('test-billing-status')).not.toBeInTheDocument();
  });
});
