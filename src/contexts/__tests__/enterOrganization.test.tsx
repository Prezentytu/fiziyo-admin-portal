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
  toastSuccess: vi.fn(),
  refetchOrganizations: vi.fn(),
  backendToken: 'backend-token',
  restartSubscriptionConnection: vi.fn(),
}));

vi.mock('@/graphql/links/wsLink', () => ({ restartSubscriptionConnection: mocks.restartSubscriptionConnection }));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      userOrganizations: [
        { organizationId: 'org-old', organizationName: 'Stara', role: 'owner', joinedAt: '' },
        { organizationId: 'org-other', organizationName: 'Druga', role: 'therapist', joinedAt: '' },
      ],
    },
    loading: false,
    error: undefined,
    refetch: mocks.refetchOrganizations,
  }),
  useMutation: () => [mocks.setDefaultOrganization],
  useApolloClient: () => ({ resetStore: mocks.resetStore }),
}));

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { changeOrganization: mocks.changeOrganization },
}));

vi.mock('@/lib/tokenCache', () => ({
  getBackendToken: () => mocks.backendToken,
  saveBackendToken: mocks.saveBackendToken,
  clearBackendToken: mocks.clearBackendToken,
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

function tokenForOrganization(organizationId: string): string {
  const payload = Buffer.from(JSON.stringify({ clerk_id: 'user_a', organization_id: organizationId })).toString(
    'base64url'
  );
  return `header.${payload}.sig`;
}

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
    mocks.backendToken = 'backend-token';
    localStorage.clear();
    mocks.setDefaultOrganization.mockResolvedValue({});
    mocks.resetStore.mockResolvedValue([]);
    mocks.refetchOrganizations.mockResolvedValue({});
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

  it('treats a failed refetch after a successful token exchange as entered', async () => {
    mocks.changeOrganization.mockResolvedValueOnce({ access_token: 'new-token' });
    mocks.resetStore.mockRejectedValueOnce(new Error('Response not successful: 403'));
    const context = renderProvider();

    await expect(act(() => context.current.enterOrganization('org-new'))).resolves.toBeUndefined();

    expect(mocks.saveBackendToken).toHaveBeenCalledWith('new-token');
    expect(mocks.clearBackendToken).not.toHaveBeenCalled();
    expect(mocks.refetchOrganizations).toHaveBeenCalledTimes(1);
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

describe('switchOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.backendToken = 'backend-token';
    localStorage.clear();
    mocks.setDefaultOrganization.mockResolvedValue({});
    mocks.resetStore.mockResolvedValue([]);
    mocks.refetchOrganizations.mockResolvedValue({});
  });

  it('switches to a listed organization through the shared entry path', async () => {
    mocks.changeOrganization.mockResolvedValueOnce({ access_token: 'new-token' });
    const context = renderProvider();

    await act(() => context.current.switchOrganization('org-other'));

    expect(mocks.changeOrganization).toHaveBeenCalledWith('backend-token', 'org-other');
    expect(mocks.saveBackendToken).toHaveBeenCalledWith('new-token');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Przełączono na Druga', expect.any(Object));
    expect(context.current.isSwitching).toBe(false);
  });

  it('refuses an organization missing from the list without exchanging the token', async () => {
    const context = renderProvider();

    await act(() => context.current.switchOrganization('org-unknown'));

    expect(mocks.toastError).toHaveBeenCalledWith('Nie znaleziono organizacji');
    expect(mocks.changeOrganization).not.toHaveBeenCalled();
  });

  it('reports a failed token exchange as a failed switch', async () => {
    mocks.changeOrganization.mockRejectedValueOnce(new Error('Change organization failed: 403 Forbidden'));
    const context = renderProvider();

    await act(() => context.current.switchOrganization('org-other'));

    expect(mocks.toastError).toHaveBeenCalledWith('Nie udało się przełączyć organizacji', expect.any(Object));
    expect(mocks.clearBackendToken).toHaveBeenCalled();
    expect(context.current.isSwitching).toBe(false);
  });
});

describe('organization chosen without the token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.setDefaultOrganization.mockResolvedValue({});
    mocks.resetStore.mockResolvedValue([]);
    mocks.refetchOrganizations.mockResolvedValue({});
  });

  it('exchanges the token when the screen falls back to an organization the token is not for', async () => {
    // The token points to an organization outside the list; fall back to the last chosen one.
    mocks.backendToken = tokenForOrganization('org-removed');
    localStorage.setItem('fizyo_last_organization_id', 'org-other');
    mocks.changeOrganization.mockResolvedValue({ access_token: tokenForOrganization('org-other') });

    const context = renderProvider();
    await act(async () => undefined);

    expect(context.current.currentOrganization?.organizationId).toBe('org-other');
    expect(mocks.changeOrganization).toHaveBeenCalledExactlyOnceWith(mocks.backendToken, 'org-other');
    // The subscription socket must reconnect with the new organization's token.
    expect(mocks.restartSubscriptionConnection).toHaveBeenCalled();
  });

  it('tries the exchange once when it fails instead of looping', async () => {
    mocks.backendToken = tokenForOrganization('org-removed');
    localStorage.setItem('fizyo_last_organization_id', 'org-other');
    mocks.changeOrganization.mockRejectedValue(new Error('exchange failed'));

    // A fresh element each time, so React re-renders the provider instead of bailing out.
    const tree = () => (
      <OrganizationProvider>
        <span />
      </OrganizationProvider>
    );
    const { rerender } = render(tree());
    for (let i = 0; i < 5; i += 1) {
      await act(async () => rerender(tree()));
    }

    expect(mocks.changeOrganization).toHaveBeenCalledOnce();
  });

  it('keeps the token organization when it is on the list', async () => {
    mocks.backendToken = tokenForOrganization('org-old');
    localStorage.setItem('fizyo_last_organization_id', 'org-other');

    const context = renderProvider();
    await act(async () => undefined);

    expect(context.current.currentOrganization?.organizationId).toBe('org-old');
    expect(mocks.changeOrganization).not.toHaveBeenCalled();
  });
});
