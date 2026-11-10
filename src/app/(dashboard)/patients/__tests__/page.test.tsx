import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientsPage from '../page';

type QueryResult = { data: unknown; loading: boolean; error?: Error };

let patientsResult: QueryResult;
let userResult: QueryResult;

vi.mock('@apollo/client/react', () => ({
  useQuery: (queryDocument: { definitions?: Array<{ name?: { value?: string } }> }) =>
    queryDocument.definitions?.[0]?.name?.value === 'GetOrganizationPatients' ? patientsResult : userResult,
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'clerk-1' } }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' }, isLoading: false }),
}));

vi.mock('@/hooks/useRealtimePatients', () => ({ useRealtimePatients: vi.fn() }));
vi.mock('@/lib/telemetry/useSearchTelemetry', () => ({ useSearchTelemetry: vi.fn() }));
vi.mock('@/features/patients/PendingPatientInvitations', () => ({ PendingPatientInvitations: () => null }));
vi.mock('@/features/patients/PatientDialog', () => ({ PatientDialog: () => null }));
vi.mock('@/features/patients/PatientQRCodeDialog', () => ({ PatientQRCodeDialog: () => null }));
vi.mock('@/features/patients/TakeOverDialog', () => ({ TakeOverDialog: () => null }));
vi.mock('@/features/assignment/AssignmentWizard', () => ({ AssignmentWizard: () => null }));
vi.mock('@/features/patients/PatientExpandableCard', () => ({
  PATIENT_ROW_GRID: '',
  PatientExpandableCard: ({ patient }: { patient: { fullname: string } }) => <div>{patient.fullname}</div>,
}));

const therapist = { data: { userByClerkId: { id: 'therapist-1' } }, loading: false };

const patientRow = (id: string, therapistId: string) => ({
  patient: { id, fullname: `Pacjent ${id}`, email: `${id}@example.com`, isShadowUser: false },
  assignmentId: `assignment-${id}`,
  therapist: { id: therapistId },
  premiumValidUntil: '2099-01-01T00:00:00Z',
  lastActivity: new Date().toISOString(),
});

describe('PatientsPage counts', () => {
  beforeEach(() => {
    userResult = therapist;
  });

  it('does not claim zero patients while the list is still loading', () => {
    patientsResult = { data: undefined, loading: true };

    render(<PatientsPage />);

    expect(screen.getByText('Wczytuję pacjentów…')).toBeInTheDocument();
    expect(screen.queryByText(/pod Twoją opieką/)).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-filter-my-btn')).toHaveTextContent(/^Moi pacjenci$/);
    expect(screen.getByTestId('patient-filter-all-btn')).toHaveTextContent(/^Wszyscy$/);
  });

  it('holds "my" counts until the therapist is known', () => {
    patientsResult = { data: { organizationPatients: [patientRow('a', 'therapist-1')] }, loading: false };
    userResult = { data: undefined, loading: true };

    render(<PatientsPage />);

    expect(screen.queryByText(/pod Twoją opieką/)).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-filter-my-btn')).toHaveTextContent(/^Moi pacjenci$/);
  });

  it('shows the counts once the list has loaded', () => {
    patientsResult = {
      data: { organizationPatients: [patientRow('a', 'therapist-1'), patientRow('b', 'therapist-2')] },
      loading: false,
    };

    render(<PatientsPage />);

    expect(screen.getByText('1 pod Twoją opieką · 2 w organizacji')).toBeInTheDocument();
    expect(screen.getByTestId('patient-filter-my-btn')).toHaveTextContent('Moi pacjenci1');
    expect(screen.getByTestId('patient-filter-all-btn')).toHaveTextContent('Wszyscy2');
  });

  it('shows real zeros for an organization without patients', () => {
    patientsResult = { data: { organizationPatients: [] }, loading: false };

    render(<PatientsPage />);

    expect(screen.getByText('0 pod Twoją opieką · 0 w organizacji')).toBeInTheDocument();
  });
});
