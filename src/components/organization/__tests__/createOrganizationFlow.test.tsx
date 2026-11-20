import { useSyncExternalStore } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { CreateOrganizationDialogProvider } from '../CreateOrganizationDialogProvider';

type Organization = { organizationId: string; organizationName: string; role: string; joinedAt: string };

const backend = vi.hoisted(() => {
  let organizations: Organization[] = [];
  const listeners = new Set<() => void>();
  return {
    createOrganization: vi.fn(),
    changeOrganization: vi.fn(),
    resetStore: vi.fn(),
    toastSuccess: vi.fn(),
    getOrganizations: () => organizations,
    setOrganizations: (next: Organization[]) => {
      organizations = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock('next/image', () => ({ default: () => null }));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => {
    const organizations = useSyncExternalStore(backend.subscribe, backend.getOrganizations);
    return { data: { userOrganizations: organizations }, loading: false, error: undefined, refetch: vi.fn() };
  },
  useMutation: (document: { definitions: Array<{ name?: { value?: string } }> }) =>
    document.definitions[0]?.name?.value === 'CreateOrganization'
      ? [backend.createOrganization]
      : [vi.fn().mockResolvedValue({})],
  useApolloClient: () => ({ resetStore: backend.resetStore }),
}));

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { changeOrganization: backend.changeOrganization },
}));

vi.mock('@/lib/tokenCache', () => ({
  getBackendToken: () => 'backend-token',
  saveBackendToken: vi.fn(),
  clearBackendToken: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: backend.toastSuccess, warning: vi.fn(), error: vi.fn() } }));

const current: Organization = {
  organizationId: 'org-1',
  organizationName: 'Gabinet Stary',
  role: 'owner',
  joinedAt: '',
};
const created: Organization = {
  organizationId: 'org-new',
  organizationName: 'Gabinet Nowy',
  role: 'owner',
  joinedAt: '',
};

describe('creating an organization from the switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backend.setOrganizations([current]);
  });

  it('keeps the dialog mounted while the new organization is not listed yet, then shows it', async () => {
    let finishRefetch: () => void = () => undefined;
    backend.createOrganization.mockResolvedValueOnce({
      data: { createOrganization: { id: created.organizationId, name: created.organizationName } },
    });
    backend.changeOrganization.mockResolvedValueOnce({ access_token: 'new-token' });
    backend.resetStore.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRefetch = () => {
            backend.setOrganizations([current, created]);
            resolve();
          };
        })
    );
    const user = userEvent.setup();
    render(
      <OrganizationProvider>
        <CreateOrganizationDialogProvider>
          <TooltipProvider>
            <OrganizationSwitcher />
          </TooltipProvider>
        </CreateOrganizationDialogProvider>
      </OrganizationProvider>
    );

    await user.click(await screen.findByTestId('nav-org-switcher-trigger'));
    await user.click(await screen.findByTestId('nav-org-switcher-create'));
    await user.type(await screen.findByTestId('org-create-name-input'), created.organizationName);
    await user.click(screen.getByTestId('org-create-submit-btn'));

    await waitFor(() => expect(backend.resetStore).toHaveBeenCalled());
    expect(screen.getByTestId('org-create-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('org-create-submit-btn')).toBeDisabled();

    finishRefetch();

    await waitFor(() => expect(screen.queryByTestId('org-create-dialog')).not.toBeInTheDocument());
    expect(backend.createOrganization).toHaveBeenCalledTimes(1);
    expect(backend.changeOrganization).toHaveBeenCalledWith('backend-token', 'org-new');
    expect(backend.toastSuccess).toHaveBeenCalledWith('Utworzono organizację Gabinet Nowy', expect.any(Object));
    expect(screen.getByTestId('nav-org-switcher-trigger')).toHaveTextContent('Gabinet Nowy');
  });
});
