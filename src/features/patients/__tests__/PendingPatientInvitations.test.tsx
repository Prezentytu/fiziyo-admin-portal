import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PendingPatientInvitations } from '../PendingPatientInvitations';

const mockUseQuery = vi.fn();
const revokeMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [revokeMock, { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const pending = {
  id: 'inv-1',
  organizationId: 'org-1',
  email: 'anna@example.com',
  status: 'pending',
  createdAt: '2026-10-30T10:00:00Z',
  expiresAt: '2099-11-10T00:00:00Z',
};

describe('PendingPatientInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeMock.mockResolvedValue({ data: { revokePatientInvitation: true } });
  });

  it('lists pending invitations and revokes the chosen one', async () => {
    const result = { data: { patientInvitations: [pending] }, error: undefined, refetch: vi.fn() };
    mockUseQuery.mockReturnValue(result);
    const user = userEvent.setup();
    render(<PendingPatientInvitations organizationId="org-1" />);

    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    await user.click(screen.getByTestId('patient-invitation-revoke-btn'));

    await waitFor(() => {
      expect(revokeMock).toHaveBeenCalledWith({ variables: { invitationId: 'inv-1' } });
    });
  });

  it('renders nothing without pending invitations', () => {
    mockUseQuery.mockReturnValue({ data: { patientInvitations: [] }, error: undefined, refetch: vi.fn() });
    const { container } = render(<PendingPatientInvitations organizationId="org-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a retry when the list fails to load', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({ data: undefined, error: new Error('boom'), refetch });
    const user = userEvent.setup();
    render(<PendingPatientInvitations organizationId="org-1" />);

    await user.click(screen.getByTestId('patient-invitations-retry-btn'));
    expect(refetch).toHaveBeenCalled();
  });
});
