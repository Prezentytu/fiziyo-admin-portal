import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvitePage from '@/app/(auth)/invite/page';
import { OrganizationsList } from '@/components/settings/OrganizationsList';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';

const mocks = vi.hoisted(() => ({
  changeOrganization: vi.fn(),
  getBackendToken: vi.fn(),
  saveBackendToken: vi.fn(),
  clearBackendToken: vi.fn(),
  acceptInvitation: vi.fn(),
  setDefaultOrganization: vi.fn(),
  navigate: vi.fn(),
  inviteToken: 'synthetic-invitation-token',
}));

const router = { replace: mocks.navigate, push: mocks.navigate };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams({ token: mocks.inviteToken }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true }),
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: {} }),
}));

vi.mock('@/components/organization/CreateOrganizationDialogProvider', () => ({
  useOpenCreateOrganization: () => vi.fn(),
}));

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { changeOrganization: mocks.changeOrganization },
}));

vi.mock('@/lib/tokenCache', () => ({
  getBackendToken: mocks.getBackendToken,
  saveBackendToken: mocks.saveBackendToken,
  clearBackendToken: mocks.clearBackendToken,
}));

const current = { organizationId: 'org-old', organizationName: 'Dotychczasowy gabinet', logoUrl: null, role: 'owner', joinedAt: '' };
const invited = { organizationId: 'org-new', organizationName: 'Nowy gabinet', logoUrl: null, role: 'therapist', joinedAt: '' };
const preview = {
  id: 'invitation',
  organizationId: invited.organizationId,
  role: invited.role,
  email: null,
  message: null,
  invitationToken: mocks.inviteToken,
  createdAt: '2026-11-20T10:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z',
  acceptedAt: null,
  invitedBy: null,
  organization: { id: invited.organizationId, name: invited.organizationName, logoUrl: null },
};

function tokenFor(organizationId: string) {
  return `test.${btoa(JSON.stringify({ organization_id: organizationId }))}.test`;
}

function createClient() {
  let accepted = false;
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink((operation) => new Observable((observer) => {
      switch (operation.operationName) {
        case 'GetUserOrganizations':
          observer.next({ data: { userOrganizations: accepted ? [current, invited] : [current] } });
          break;
        case 'GetInvitationByToken':
          observer.next({ data: { invitationByToken: { ...preview, status: accepted ? 'accepted' : 'pending' } } });
          break;
        case 'AcceptInvitation':
          mocks.acceptInvitation(operation.variables);
          accepted = true;
          observer.next({ data: { acceptInvitation: { ...preview, id: 'new-membership', userId: 'user', joinedAt: '', status: 'active' } } });
          break;
        case 'SetDefaultOrganization':
          mocks.setDefaultOrganization(operation.variables);
          observer.next({ data: { setDefaultOrganization: {
            id: 'user', clerkId: 'clerk-user', username: 'user', fullname: 'Test User', email: 'user@example.test',
            systemRole: null, defaultOrganizationId: invited.organizationId,
            organizationIds: [current.organizationId, invited.organizationId],
          } } });
          break;
        default:
          observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
          return;
      }
      observer.complete();
    })),
  });
}

function SettingsOrganizations() {
  const { currentOrganization, organizations, isLoading } = useOrganization();
  if (isLoading) return null;
  return (
    <>
      <OrganizationsList organizations={organizations.map((org) => ({ ...org, logoUrl: org.logoUrl ?? undefined }))} />
      <output>{currentOrganization?.organizationName}</output>
    </>
  );
}

function renderInvitePage() {
  render(<ApolloProvider client={createClient()}><InvitePage /></ApolloProvider>);
}

function renderSettings() {
  render(
    <ApolloProvider client={createClient()}>
      <OrganizationProvider>
        <SettingsOrganizations />
      </OrganizationProvider>
    </ApolloProvider>
  );
}

async function pasteInvitation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Wklej link zaproszenia/ }));
  const input = screen.getByRole('textbox', { name: 'Wklej link zaproszenia' });
  await user.click(input);
  await user.paste(`https://portal.example.test/invite?token=${mocks.inviteToken}`);
  await screen.findByText(invited.organizationName);
  await user.click(await screen.findByRole('button', { name: 'Dołącz do organizacji' }));
}

describe('joining an organization from an invitation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mocks.getBackendToken.mockReturnValue(tokenFor(current.organizationId));
    mocks.saveBackendToken.mockImplementation((token: string) => mocks.getBackendToken.mockReturnValue(token));
    mocks.changeOrganization.mockResolvedValue({ access_token: tokenFor(invited.organizationId) });
  });

  it('activates the invited organization before continuing from the welcome screen', async () => {
    const user = userEvent.setup();
    const activation = Promise.withResolvers<{ access_token: string }>();
    mocks.changeOrganization.mockReturnValueOnce(activation.promise);
    renderInvitePage();

    await user.click(await screen.findByRole('button', { name: 'Dołącz do organizacji' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Przełączanie organizacji');
    expect(screen.queryByRole('heading', { name: 'Witaj w Nowy gabinet!' })).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.acceptInvitation).toHaveBeenCalledWith({ invitationToken: mocks.inviteToken });
    expect(mocks.changeOrganization).toHaveBeenCalledWith(tokenFor(current.organizationId), invited.organizationId);

    activation.resolve({ access_token: tokenFor(invited.organizationId) });
    await screen.findByRole('heading', { name: 'Witaj w Nowy gabinet!' });
    expect(mocks.getBackendToken()).toBe(tokenFor(invited.organizationId));
    expect(mocks.setDefaultOrganization).toHaveBeenCalledWith({ organizationId: invited.organizationId });

    await user.click(screen.getByRole('button', { name: 'Zaczynamy!' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/'));
  });

  it('pastes a link from settings and switches the active organization', async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(await screen.findByRole('status')).toHaveTextContent(current.organizationName);
    await pasteInvitation(user);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(invited.organizationName));
    expect(mocks.acceptInvitation).toHaveBeenCalledExactlyOnceWith({ invitationToken: mocks.inviteToken });
    expect(mocks.changeOrganization).toHaveBeenCalledWith(tokenFor(current.organizationId), invited.organizationId);
  });

  it('keeps the settings dialog open until switching can be retried', async () => {
    const user = userEvent.setup();
    mocks.changeOrganization.mockRejectedValueOnce(new Error('Temporary connection failure'));
    renderSettings();

    await pasteInvitation(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Zaproszenie zostało przyjęte');
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(invited.organizationName));
    expect(mocks.acceptInvitation).toHaveBeenCalledTimes(1);
  });

  it('retries switching after joining without consuming the invitation twice', async () => {
    const user = userEvent.setup();
    mocks.changeOrganization.mockRejectedValueOnce(new Error('Temporary connection failure'));
    renderInvitePage();

    await user.click(await screen.findByRole('button', { name: 'Dołącz do organizacji' }));
    await user.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));

    await screen.findByRole('heading', { name: 'Witaj w Nowy gabinet!' });
    expect(mocks.acceptInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.changeOrganization).toHaveBeenCalledTimes(2);
    expect(mocks.getBackendToken()).toBe(tokenFor(invited.organizationId));
  });
});
