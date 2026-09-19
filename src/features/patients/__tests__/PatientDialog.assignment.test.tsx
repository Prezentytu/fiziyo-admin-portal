import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { PatientDialog } from '../PatientDialog';

const mockCreatePatientMutation = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mockCreatePatientMutation, { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/features/assignment/AssignmentWizard', () => ({
  AssignmentWizard: () => null,
}));

vi.mock('../UnifiedPatientInput', () => ({
  UnifiedPatientInput: ({
    onCreateNewPatient,
    onSuccess,
  }: {
    onCreateNewPatient: (values: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      contextLabel?: string;
    }) => Promise<void>;
    onSuccess: (patient: { id: string; fullname: string; email?: string }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="mock-create-patient-submit-btn"
        onClick={() =>
          onCreateNewPatient({
            firstName: 'Anna',
            lastName: 'Nowak',
            email: 'anna@example.com',
          })
        }
      >
        Create
      </button>
      <button
        type="button"
        data-testid="mock-lookup-success-btn"
        onClick={() =>
          onSuccess({
            id: 'existing-patient',
            fullname: 'Istniejacy Pacjent',
            email: 'istniejacy@example.com',
          })
        }
      >
        Lookup success
      </button>
    </div>
  ),
}));

describe('PatientDialog embedded assignment flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(overrides?: Partial<ComponentProps<typeof PatientDialog>>) {
    const onOpenChange = vi.fn();
    const onPatientCreated = vi.fn();

    render(
      <PatientDialog
        open={true}
        onOpenChange={onOpenChange}
        organizationId="org-1"
        therapistId="therapist-1"
        embeddedMode="assignment"
        onPatientCreated={onPatientCreated}
        {...overrides}
      />
    );

    return { onOpenChange, onPatientCreated };
  }

  it('emits onPatientCreated and closes dialog after successful create', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onPatientCreated } = renderDialog();

    mockCreatePatientMutation.mockResolvedValueOnce({
      data: {
        createShadowPatient: {
          id: 'patient-created',
          fullname: 'Anna Nowak',
          email: 'anna@example.com',
        },
      },
    });

    await user.click(screen.getByTestId('mock-create-patient-submit-btn'));

    await waitFor(() => {
      expect(onPatientCreated).toHaveBeenCalledWith({
        id: 'patient-created',
        name: 'Anna Nowak',
        email: 'anna@example.com',
        isShadowUser: true,
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not emit onPatientCreated and does not close on create failure', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onPatientCreated } = renderDialog();

    mockCreatePatientMutation.mockRejectedValueOnce(new Error('Network failure'));

    await user.click(screen.getByTestId('mock-create-patient-submit-btn'));

    await waitFor(() => {
      expect(onPatientCreated).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(toastError).toHaveBeenCalledWith('Nie udało się dodać pacjenta');
    });
  });

  it('selects existing lookup patient immediately in embedded mode', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onPatientCreated } = renderDialog();

    await user.click(screen.getByTestId('mock-lookup-success-btn'));

    expect(onPatientCreated).toHaveBeenCalledWith({
      id: 'existing-patient',
      name: 'Istniejacy Pacjent',
      email: 'istniejacy@example.com',
      isShadowUser: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('PatientDialog default success actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje jedno główne CTA po dodaniu pacjenta i zostawia Zamknij', async () => {
    const user = userEvent.setup();

    mockCreatePatientMutation.mockResolvedValueOnce({
      data: {
        createShadowPatient: {
          id: 'patient-created',
          fullname: 'Anna Nowak',
          email: 'anna@example.com',
        },
      },
    });

    render(
      <PatientDialog
        open={true}
        onOpenChange={vi.fn()}
        organizationId="org-1"
        therapistId="therapist-1"
      />
    );

    await user.click(screen.getByTestId('mock-create-patient-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Pacjent dodany!')).toBeInTheDocument();
    });

    expect(screen.getByTestId('patient-dialog-assign-btn')).toHaveTextContent('Personalizuj i przypisz');
    expect(screen.getByTestId('patient-dialog-add-another-btn')).toHaveTextContent('Dodaj kolejnego pacjenta');
    expect(screen.getByTestId('patient-dialog-close-btn')).toHaveTextContent('Zamknij');
  });
});
