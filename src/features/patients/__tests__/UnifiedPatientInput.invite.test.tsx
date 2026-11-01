import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnifiedPatientInput } from '../UnifiedPatientInput';
import { FIND_USER_BY_EMAIL_QUERY, FIND_USER_BY_PHONE_QUERY } from '@/graphql/queries/users.queries';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';

const INVITE_REQUIRED_MESSAGE =
  'Tego pacjenta nie można dodać bezpośrednio. Wyślij zaproszenie na jego adres email – pacjent dołączy do gabinetu po akceptacji w aplikacji.';

const ASYNC = { timeout: 3000 };
const mockUseQuery = vi.fn();
const invitePatientMock = vi.fn();
const assignPatientMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (document: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = document.definitions?.[0]?.name?.value;
    if (operationName === 'InvitePatient') return [invitePatientMock, { loading: false }];
    if (operationName === 'AssignPatientToTherapist') return [assignPatientMock, { loading: false }];
    return [vi.fn(), { loading: false }];
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function inviteRequiredError() {
  return new CombinedGraphQLErrors({
    errors: [{ message: INVITE_REQUIRED_MESSAGE, extensions: { code: 'PATIENT_INVITE_REQUIRED' } }],
  });
}

// Stable references: the component re-runs its lookup effects whenever `data` identity changes.
function mockLookup(found: { userByEmail?: unknown; userByPhone?: unknown }) {
  const therapistPatients = { data: { therapistPatients: [] }, loading: false };
  const emailResult = { data: { userByEmail: found.userByEmail ?? null }, loading: false };
  const phoneResult = { data: { userByPhone: found.userByPhone ?? null }, loading: false };
  const empty = { data: undefined, loading: false };
  mockUseQuery.mockImplementation((query: unknown, options?: { skip?: boolean }) => {
    if (query === GET_ALL_THERAPIST_PATIENTS_QUERY) return therapistPatients;
    if (query === FIND_USER_BY_EMAIL_QUERY && !options?.skip) return emailResult;
    if (query === FIND_USER_BY_PHONE_QUERY && !options?.skip) return phoneResult;
    return empty;
  });
}

function renderInput(onCreateNewPatient = vi.fn()) {
  render(
    <UnifiedPatientInput
      organizationId="org-1"
      therapistId="ther-1"
      onSuccess={vi.fn()}
      onCreateNewPatient={onCreateNewPatient}
      onCancel={vi.fn()}
    />
  );
}

async function submitNewPatient(user: ReturnType<typeof userEvent.setup>, contact: string) {
  await user.type(screen.getByTestId('patient-unified-input'), contact);
  await user.click(screen.getByTestId('patient-unified-next-btn'));
  await user.type(await screen.findByTestId('patient-unified-firstname-input', undefined, ASYNC), 'Anna');
  await user.type(screen.getByTestId('patient-unified-lastname-input'), 'Nowak');
  await user.click(screen.getByTestId('patient-unified-form-submit-btn'));
}

describe('UnifiedPatientInput: PATIENT_INVITE_REQUIRED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invitePatientMock.mockResolvedValue({
      data: { invitePatient: { id: 'inv-1', email: 'anna@example.com', status: 'pending' } },
    });
  });

  it('po odmowie utworzenia pokazuje zaproszenie i wysyła je na podany adres', async () => {
    mockLookup({});
    const user = userEvent.setup();
    renderInput(vi.fn().mockResolvedValue({ status: 'invite-required', message: INVITE_REQUIRED_MESSAGE }));

    await submitNewPatient(user, 'anna@example.com');

    expect(await screen.findByText(INVITE_REQUIRED_MESSAGE, undefined, ASYNC)).toBeInTheDocument();
    expect(screen.getByTestId('patient-invite-email-input')).toHaveValue('anna@example.com');

    await user.click(screen.getByTestId('patient-invite-send-btn'));

    await waitFor(() => {
      expect(invitePatientMock).toHaveBeenCalledWith({ variables: { email: 'anna@example.com' } });
    }, ASYNC);
    expect(await screen.findByTestId('patient-invite-pending', undefined, ASYNC)).toHaveTextContent(
      'Zaproszenie czeka na akceptację'
    );
  });

  it('przy numerze telefonu prosi o adres przed wysłaniem zaproszenia', async () => {
    mockLookup({});
    const user = userEvent.setup();
    renderInput(vi.fn().mockResolvedValue({ status: 'invite-required', message: INVITE_REQUIRED_MESSAGE }));

    await submitNewPatient(user, '600100200');

    const emailInput = await screen.findByTestId('patient-invite-email-input', undefined, ASYNC);
    expect(emailInput).toHaveValue('');
    await user.click(screen.getByTestId('patient-invite-send-btn'));
    expect(invitePatientMock).not.toHaveBeenCalled();

    await user.type(emailInput, 'anna@example.com');
    await user.click(screen.getByTestId('patient-invite-send-btn'));

    await waitFor(() => {
      expect(invitePatientMock).toHaveBeenCalledWith({ variables: { email: 'anna@example.com' } });
    }, ASYNC);
  });

  it('gdy przypięcie znalezionego pacjenta wymaga zgody, przechodzi do zaproszenia', async () => {
    mockLookup({
      userByEmail: { id: 'patient-7', fullname: 'Anna Nowak', email: 'anna@example.com', organizationIds: ['org-1'] },
    });
    assignPatientMock.mockRejectedValue(inviteRequiredError());
    const user = userEvent.setup();
    renderInput();

    await user.type(screen.getByTestId('patient-unified-input'), 'anna@example.com');
    await user.click(screen.getByTestId('patient-unified-next-btn'));
    await user.click(await screen.findByTestId('patient-unified-add-existing-btn', undefined, ASYNC));

    expect(await screen.findByText(INVITE_REQUIRED_MESSAGE, undefined, ASYNC)).toBeInTheDocument();
    expect(screen.getByTestId('patient-invite-email-input')).toHaveValue('anna@example.com');
  });
});
