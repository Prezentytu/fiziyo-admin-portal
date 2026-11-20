import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { CreateOrganizationDialogProvider } from '@/components/organization/CreateOrganizationDialogProvider';
import { OrganizationSwitcher } from './OrganizationSwitcher';

const organizationState = vi.hoisted(() => ({
  organizations: [] as Array<{ organizationId: string; organizationName: string; role: string; joinedAt: string }>,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: organizationState.organizations[0] ?? null,
    organizations: organizationState.organizations,
    isLoading: false,
    isSwitching: false,
    switchOrganization: vi.fn(),
    hasMultipleOrganizations: organizationState.organizations.length > 1,
  }),
}));

vi.mock('@/components/organization/CreateOrganizationDialog', () => ({
  CreateOrganizationDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" data-testid="org-create-dialog">
        <input data-testid="org-create-name-input" />
      </div>
    ) : null,
}));

const ownOrganization = { organizationId: 'org-1', organizationName: 'Fizjo Kraków', role: 'owner', joinedAt: '' };
const otherOrganization = {
  organizationId: 'org-2',
  organizationName: 'Fizjo Gdańsk',
  role: 'therapist',
  joinedAt: '',
};

function renderSwitcher(isCollapsed = false) {
  render(
    <CreateOrganizationDialogProvider>
      <TooltipProvider>
        <OrganizationSwitcher isCollapsed={isCollapsed} />
      </TooltipProvider>
    </CreateOrganizationDialogProvider>
  );
  return userEvent.setup();
}

describe('OrganizationSwitcher', () => {
  beforeEach(() => {
    organizationState.organizations = [ownOrganization];
  });

  it('lets a member of a single organization create another one', async () => {
    const user = renderSwitcher();

    await user.click(screen.getByTestId('nav-org-switcher-trigger'));
    await user.click(await screen.findByTestId('nav-org-switcher-create'));

    expect(screen.getByTestId('org-create-dialog')).toBeInTheDocument();
  });

  it('opens the create dialog in place instead of navigating to onboarding', async () => {
    organizationState.organizations = [ownOrganization, otherOrganization];
    const user = renderSwitcher(true);

    await user.click(screen.getByTestId('nav-org-switcher-trigger'));
    const createItem = await screen.findByTestId('nav-org-switcher-create');

    expect(createItem).not.toHaveAttribute('href');
    expect(screen.getByTestId('nav-org-switcher-item-org-2')).toBeInTheDocument();
    await user.click(createItem);
    expect(screen.getByTestId('org-create-dialog')).toBeInTheDocument();
  });

  it('leaves Cmd+O alone while typing in the create dialog', async () => {
    const user = renderSwitcher();
    await user.click(screen.getByTestId('nav-org-switcher-trigger'));
    await user.click(await screen.findByTestId('nav-org-switcher-create'));

    await user.click(screen.getByTestId('org-create-name-input'));
    await user.keyboard('{Meta>}o{/Meta}');

    expect(screen.queryByTestId('nav-org-switcher-create')).not.toBeInTheDocument();
  });
});
