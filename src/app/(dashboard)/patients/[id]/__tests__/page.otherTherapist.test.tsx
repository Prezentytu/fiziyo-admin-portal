import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientDetailPage from '../page';

let patientResult: { data?: unknown; loading: boolean; error?: Error };

vi.mock('@apollo/client/react', () => ({
  useQuery: (queryDocument: { definitions?: Array<{ name?: { value?: string } }> }) =>
    queryDocument.definitions?.[0]?.name?.value === 'GetUserById'
      ? { ...patientResult, refetch: vi.fn() }
      : { data: undefined, loading: false, refetch: vi.fn() },
  useMutation: () => [vi.fn(), { loading: false }],
  useApolloClient: () => ({}),
}));

vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { id: 'clerk-1' } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1', role: 'therapist' }, isLoading: false }),
}));

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <PatientDetailPage params={Promise.resolve({ id: 'patient-1' })} />
      </Suspense>
    );
  });
}

describe('PatientDetailPage opened from a direct link', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('says another therapist leads the patient instead of a generic error', async () => {
    const message =
      'Ten pacjent jest już w gabinecie i prowadzi go inny fizjoterapeuta. Poproś właściciela albo administratora gabinetu o przypisanie go do Ciebie.';
    patientResult = {
      loading: false,
      error: new CombinedGraphQLErrors({
        data: null,
        errors: [{ message, extensions: { code: 'PATIENT_UNDER_OTHER_THERAPIST' } }],
      }),
    };

    await renderPage();

    expect(await screen.findByTestId('patient-detail-other-therapist')).toHaveTextContent(message);
    expect(screen.getByTestId('patient-detail-other-therapist-back-btn')).toBeInTheDocument();
    expect(screen.queryByText('Nie udało się pobrać pacjenta.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-detail-retry-btn')).not.toBeInTheDocument();
  });

  it('keeps the retry state for any other failure', async () => {
    patientResult = { loading: false, error: new Error('Failed to fetch') };

    await renderPage();

    expect(await screen.findByText('Nie udało się pobrać pacjenta.')).toBeInTheDocument();
    expect(screen.getByTestId('patient-detail-retry-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('patient-detail-other-therapist')).not.toBeInTheDocument();
  });
});
