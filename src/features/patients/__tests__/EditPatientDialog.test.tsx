import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditPatientDialog } from '../EditPatientDialog';

const EMAIL_UNAVAILABLE_MESSAGE =
  'Tego adresu nie można przypisać temu pacjentowi. Jeśli pacjent ma już konto FiziYo na ten adres, wyślij mu zaproszenie – połączy konto z gabinetem po akceptacji.';

const ASYNC = { timeout: 3000 };
const updatePatientMock = vi.fn();
const invitePatientMock = vi.fn();
const toastError = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (document: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = document.definitions?.[0]?.name?.value;
    if (operationName === 'InvitePatient') return [invitePatientMock, { loading: false }];
    if (operationName === 'UpdateShadowPatient') return [updatePatientMock, { loading: false }];
    return [vi.fn(), { loading: false }];
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const patient = {
  id: 'patient-1',
  fullname: 'Anna Nowak',
  email: 'stary@example.com',
  isShadowUser: true,
  personalData: { firstName: 'Anna', lastName: 'Nowak' },
};

describe('EditPatientDialog: PATIENT_EMAIL_UNAVAILABLE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePatientMock.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [{ message: EMAIL_UNAVAILABLE_MESSAGE, extensions: { code: 'PATIENT_EMAIL_UNAVAILABLE' } }],
      })
    );
    invitePatientMock.mockResolvedValue({
      data: { invitePatient: { id: 'inv-1', email: 'zajety@example.com', status: 'pending' } },
    });
  });

  it('pokazuje komunikat z backendu i wysyła zaproszenie na ten adres', async () => {
    const user = userEvent.setup();
    render(<EditPatientDialog open onOpenChange={vi.fn()} patient={patient} />);

    const emailInput = screen.getByTestId('edit-patient-email');
    await user.clear(emailInput);
    await user.type(emailInput, 'zajety@example.com');
    await user.click(screen.getByTestId('edit-patient-submit-btn'));

    expect(await screen.findByText(EMAIL_UNAVAILABLE_MESSAGE, undefined, ASYNC)).toBeInTheDocument();
    expect(screen.queryByText('Nie udało się zaktualizować danych pacjenta')).not.toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalledWith('Nie udało się zaktualizować danych pacjenta');

    const sendButton = screen.getByTestId('patient-invite-send-btn');
    expect(sendButton).toHaveTextContent('Wyślij zaproszenie na ten adres');
    await user.click(sendButton);

    await waitFor(() => {
      expect(invitePatientMock).toHaveBeenCalledWith({ variables: { email: 'zajety@example.com' } });
    }, ASYNC);
    expect(await screen.findByTestId('patient-invite-pending', undefined, ASYNC)).toHaveTextContent(
      'Zaproszenie czeka na akceptację'
    );
  });

  it('chowa akcję zaproszenia po zmianie adresu', async () => {
    const user = userEvent.setup();
    render(<EditPatientDialog open onOpenChange={vi.fn()} patient={patient} />);

    const emailInput = screen.getByTestId('edit-patient-email');
    await user.clear(emailInput);
    await user.type(emailInput, 'zajety@example.com');
    await user.click(screen.getByTestId('edit-patient-submit-btn'));
    await screen.findByText(EMAIL_UNAVAILABLE_MESSAGE, undefined, ASYNC);

    await user.type(emailInput, 'x');

    expect(screen.queryByText(EMAIL_UNAVAILABLE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-invite-send-btn')).not.toBeInTheDocument();
  });
});
