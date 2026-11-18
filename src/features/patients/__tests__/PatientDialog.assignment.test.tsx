import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { PatientDialog } from '../PatientDialog';

const mockCreatePatientMutation = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const createOutcomes: unknown[] = [];

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
    }) => Promise<unknown>;
    onSuccess: (patient: { id: string; fullname: string; email?: string }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="mock-create-patient-submit-btn"
        onClick={async () => {
          createOutcomes.push(
            await onCreateNewPatient({
              firstName: 'Anna',
              lastName: 'Nowak',
              email: 'anna@example.com',
            })
          );
        }}
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
    createOutcomes.length = 0;
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

  it('hands a patient led by another therapist back to the form as a notice, not as a generic failure', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onPatientCreated } = renderDialog();
    const message = 'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta.';

    mockCreatePatientMutation.mockRejectedValueOnce(
      new CombinedGraphQLErrors({
        data: null,
        errors: [{ message, extensions: { code: 'PATIENT_UNDER_OTHER_THERAPIST' } }],
      })
    );

    await user.click(screen.getByTestId('mock-create-patient-submit-btn'));

    await waitFor(() => expect(createOutcomes).toEqual([{ status: 'other-therapist', message }]));
    expect(onPatientCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
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
