import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationProvider, useOrganization } from '../OrganizationContext';

const mocks = vi.hoisted(() => ({
  changeOrganization: vi.fn(),
  saveBackendToken: vi.fn(),
  clearBackendToken: vi.fn(),
  resetStore: vi.fn(),
  setDefaultOrganization: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      userOrganizations: [{ organizationId: 'org-old', organizationName: 'Stara', role: 'owner', joinedAt: '' }],
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useMutation: () => [mocks.setDefaultOrganization],
  useApolloClient: () => ({ resetStore: mocks.resetStore }),
}));

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { changeOrganization: mocks.changeOrganization },
}));

vi.mock('@/lib/tokenCache', () => ({
  getBackendToken: () => 'backend-token',
  saveBackendToken: mocks.saveBackendToken,
  clearBackendToken: mocks.clearBackendToken,
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

function renderProvider() {
  const context: { current: ReturnType<typeof useOrganization> | null } = { current: null };
  function Probe() {
    context.current = useOrganization();
    return null;
  }
  render(
    <OrganizationProvider>
      <Probe />
    </OrganizationProvider>
  );
  if (!context.current) throw new Error('Provider did not render');
  return context as { current: ReturnType<typeof useOrganization> };
}

describe('enterOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDefaultOrganization.mockResolvedValue({});
    mocks.resetStore.mockResolvedValue([]);
  });

  it('enters an organization that is not in the cached list yet', async () => {
    mocks.changeOrganization.mockResolvedValueOnce({ access_token: 'new-token' });
    const context = renderProvider();

    await act(() => context.current.enterOrganization('org-new'));

    expect(mocks.changeOrganization).toHaveBeenCalledWith('backend-token', 'org-new');
    expect(mocks.saveBackendToken).toHaveBeenCalledWith('new-token');
    expect(mocks.setDefaultOrganization).toHaveBeenCalledWith({ variables: { organizationId: 'org-new' } });
    expect(mocks.resetStore).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('rethrows a failed token exchange and drops a rejected token', async () => {
    mocks.changeOrganization.mockRejectedValueOnce(new Error('Change organization failed: 403 Forbidden'));
    const context = renderProvider();

    await expect(act(() => context.current.enterOrganization('org-new'))).rejects.toThrow('403');

    expect(mocks.clearBackendToken).toHaveBeenCalled();
    expect(mocks.saveBackendToken).not.toHaveBeenCalled();
    expect(mocks.resetStore).not.toHaveBeenCalled();
  });
});
