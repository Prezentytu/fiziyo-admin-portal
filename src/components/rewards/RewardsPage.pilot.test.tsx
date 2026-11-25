// @vitest-environment-options { "url": "http://localhost:3360" }
import { readFileSync } from 'node:fs';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RewardsPage from '@/app/(dashboard)/rewards/page';
import { PatientRewardPanel } from './PatientRewardPanel';

const organization = vi.hoisted(() => ({ organizationId: 'lab-gabinet', role: 'owner' }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: organization, isLoading: false, isSwitching: false }),
}));

// Read-only integration with the local SPEC-060 fixture. Run with its private sessions file.
const sessionsPath = process.env.REWARDS_PILOT_SESSIONS;
describe.skipIf(!sessionsPath)('rewards components against the local pilot API', () => {
  function renderAs(role: 'owner' | 'therapist' | 'control', component: React.ReactElement) {
    const sessions = JSON.parse(readFileSync(sessionsPath!, 'utf8')) as Record<string, string>;
    organization.organizationId = role === 'control' ? 'lab-kontrola' : 'lab-gabinet';
    organization.role = role === 'therapist' ? 'therapist' : 'owner';
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: 'http://localhost:5260/graphql',
        headers: { Authorization: `Bearer ${sessions[role]}` },
        fetchOptions: { redirect: 'error' },
      }),
    });
    return render(<ApolloProvider client={client}>{component}</ApolloProvider>);
  }
  afterEach(cleanup);
  it('lets the pilot owner select templates and configure the cabinet', async () => {
    renderAs('owner', <RewardsPage />);
    expect(await screen.findByRole('switch')).toBeEnabled();
    expect(await screen.findByRole('heading', { name: 'Ukryta wskazówka' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Na co się cieszę w kolejnym etapie' })).toBeVisible();
    expect(screen.getAllByTestId(/^rewards-toggle-/).length).toBeGreaterThan(0);
  });
  it('shows the pilot therapist the chosen rewards without management controls', async () => {
    renderAs('therapist', <RewardsPage />);
    expect(await screen.findByRole('heading', { name: 'Odznaka uznania' })).toBeVisible();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryAllByTestId(/^rewards-toggle-/)).toHaveLength(0);
  });
  it('loads a visible patient reward card for a therapist', async () => {
    renderAs('therapist', <PatientRewardPanel patientId="patient" />);
    expect(await screen.findByTestId('patient-rewards-panel')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Za wytrwałość' })).toBeVisible();
  });
  it('keeps a control cabinet outside the pilot', async () => {
    renderAs('control', <RewardsPage />);
    expect(await screen.findByText('Nagrody są niedostępne w tym gabinecie.')).toBeVisible();
    expect(screen.queryAllByTestId(/^rewards-card-/)).toHaveLength(0);
  });
});
