import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CombinedGraphQLErrors } from '@apollo/client/errors';

import { UnifiedPatientInput } from '../UnifiedPatientInput';
import { FIND_USER_BY_EMAIL_QUERY, FIND_USER_BY_PHONE_QUERY } from '@/graphql/queries/users.queries';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const toastError = vi.fn();

function getLastQueryOptions(
  queryDocument: unknown
): { variables?: Record<string, string>; skip?: boolean } | undefined {
  const matchingCalls = mockUseQuery.mock.calls.filter((call: unknown[]) => call[0] === queryDocument);
  const latestCall = matchingCalls[matchingCalls.length - 1];
  return latestCall?.[1] as { variables?: Record<string, string>; skip?: boolean } | undefined;
}

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockUseMutation(), { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

describe('UnifiedPatientInput manual submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuery.mockImplementation((query: unknown, options?: { variables?: Record<string, string>; skip?: boolean }) => {
      if (query === FIND_USER_BY_EMAIL_QUERY) {
        return {
          data: undefined,
          loading: false,
        };
      }

      if (query === FIND_USER_BY_PHONE_QUERY) {
        return {
          data: undefined,
          loading: false,
        };
      }

      if (options?.variables?.therapistId && options?.variables?.organizationId) {
        return {
          data: { therapistPatients: [] },
          loading: false,
        };
      }

      return { data: undefined, loading: false };
    });
  });

  function renderComponent() {
    return render(
      <UnifiedPatientInput
        organizationId="org-1"
        therapistId="ther-1"
        clinicId="clinic-1"
        onSuccess={vi.fn()}
        onCreateNewPatient={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />
    );
  }

  it('does not trigger search automatically while typing', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('patient-unified-input'), 'pacjent@example.com');

    const latestEmailOptions = getLastQueryOptions(FIND_USER_BY_EMAIL_QUERY);
    expect(latestEmailOptions?.skip).toBe(true);
    expect(latestEmailOptions?.variables?.email).toBe('');
  });

  it('triggers email search only after clicking Next', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('patient-unified-input'), 'pacjent@example.com');
    await user.click(screen.getByTestId('patient-unified-next-btn'));

    await waitFor(() => {
      const latestEmailOptions = getLastQueryOptions(FIND_USER_BY_EMAIL_QUERY);
      expect(latestEmailOptions?.skip).toBe(false);
      expect(latestEmailOptions?.variables?.email).toBe('pacjent@example.com');
    });
  });

  it('triggers phone search after pressing Enter', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('patient-unified-input'), '123456789{enter}');

    await waitFor(() => {
      const latestPhoneOptions = getLastQueryOptions(FIND_USER_BY_PHONE_QUERY);
      expect(latestPhoneOptions?.skip).toBe(false);
      expect(latestPhoneOptions?.variables?.phone).toBe('+48123456789');
    });
  });

  it('shows an error when invalid input is submitted', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('patient-unified-input'), 'abc');
    await user.click(screen.getByTestId('patient-unified-next-btn'));

    expect(toastError).toHaveBeenCalledWith('Wpisz poprawny email lub numer telefonu');
  });
});

describe('UnifiedPatientInput: patient led by another therapist', () => {
  const MESSAGE =
    'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta. Poproś właściciela albo administratora gabinetu o przypisanie go do Ciebie.';
  const refusal = () =>
    new CombinedGraphQLErrors({
      data: null,
      errors: [{ message: MESSAGE, extensions: { code: 'PATIENT_UNDER_OTHER_THERAPIST' } }],
    });

  function mockLookup(emailResult: (options: { skip?: boolean }) => unknown) {
    mockUseQuery.mockImplementation((query: unknown, options?: { variables?: Record<string, string>; skip?: boolean }) => {
      if (query === FIND_USER_BY_EMAIL_QUERY) return emailResult(options ?? {});
      if (options?.variables?.therapistId) return { data: { therapistPatients: [] }, loading: false };
      return { data: undefined, loading: false };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the notice instead of the new-patient form when the lookup is refused', async () => {
    const user = userEvent.setup();
    mockLookup(({ skip }) => (skip ? { data: undefined, loading: false } : { data: undefined, loading: false, error: refusal() }));
    const onCreateNewPatient = vi.fn();
    render(
      <UnifiedPatientInput
        organizationId="org-1"
        therapistId="ther-1"
        onSuccess={vi.fn()}
        onCreateNewPatient={onCreateNewPatient}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('patient-unified-input'), 'cudzy@example.com');
    await user.click(screen.getByTestId('patient-unified-next-btn'));

    expect(await screen.findByTestId('patient-unified-other-therapist-notice')).toHaveTextContent(MESSAGE);
    expect(screen.queryByTestId('patient-unified-firstname-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-unified-found-card')).not.toBeInTheDocument();
    expect(onCreateNewPatient).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('patient-unified-input'), 'x');
    expect(screen.queryByTestId('patient-unified-other-therapist-notice')).not.toBeInTheDocument();
  });

  it('keeps a generic lookup failure out of the notice', async () => {
    const user = userEvent.setup();
    mockLookup(({ skip }) =>
      skip ? { data: undefined, loading: false } : { data: undefined, loading: false, error: new Error('Failed to fetch') }
    );
    render(
      <UnifiedPatientInput
        organizationId="org-1"
        therapistId="ther-1"
        onSuccess={vi.fn()}
        onCreateNewPatient={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('patient-unified-input'), 'ktos@example.com');
    await user.click(screen.getByTestId('patient-unified-next-btn'));

    expect(screen.queryByTestId('patient-unified-other-therapist-notice')).not.toBeInTheDocument();
  });

  it('returns from the form to the notice when creating the patient is refused', async () => {
    const user = userEvent.setup();
    mockLookup(({ skip }) => (skip ? { data: undefined, loading: false } : { data: { userByEmail: null }, loading: false }));
    const onCreateNewPatient = vi.fn().mockResolvedValue({ status: 'other-therapist', message: MESSAGE });
    render(
      <UnifiedPatientInput
        organizationId="org-1"
        therapistId="ther-1"
        onSuccess={vi.fn()}
        onCreateNewPatient={onCreateNewPatient}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('patient-unified-input'), 'nowy@example.com');
    await user.click(screen.getByTestId('patient-unified-next-btn'));
    await user.type(await screen.findByTestId('patient-unified-firstname-input'), 'Anna');
    await user.type(screen.getByTestId('patient-unified-lastname-input'), 'Nowak');
    await user.click(screen.getByTestId('patient-unified-form-submit-btn'));

    expect(await screen.findByTestId('patient-unified-other-therapist-notice')).toHaveTextContent(MESSAGE);
    expect(onCreateNewPatient).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('patient-unified-firstname-input')).not.toBeInTheDocument();
  });
});
