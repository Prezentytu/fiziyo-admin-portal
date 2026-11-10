import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_AI_CREDITS_HISTORY_QUERY } from '@/graphql/queries/billing.queries';

import { AiCreditsDetailsPopover } from './AiCreditsDetailsPopover';

const access = vi.hoisted(() => ({ canManageOrganization: false }));
const apollo = vi.hoisted(() => ({ queried: [] as unknown[] }));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));

vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ canManageOrganization: access.canManageOrganization }),
}));

vi.mock('./AiCreditsRequestControl', () => ({
  AiCreditsRequestControl: () => <div data-testid="request-control" />,
}));

vi.mock('@apollo/client/react', async () => {
  const queries = await import('@/graphql/queries/billing.queries');
  return {
    useQuery: (query: unknown, options: { skip?: boolean }) => {
      if (!options.skip) apollo.queried.push(query);
      if (query === queries.GET_AI_CREDITS_HISTORY_QUERY) {
        return {
          loading: false,
          data: {
            aiCreditsHistory: [
              { id: '1', kind: 'usage', actionType: 'chat', creditsUsed: 4, createdAt: '2026-11-09T10:00:00Z' },
              { id: '2', kind: 'refund', actionType: 'refund', creditsUsed: 1, createdAt: '2026-11-09T10:01:00Z' },
            ],
          },
        };
      }
      return {
        loading: false,
        data: {
          aiCreditsStatus: {
            monthlyLimit: 50,
            monthlyUsed: 4,
            monthlyRemaining: 46,
            addonCredits: 0,
            totalRemaining: 46,
            resetDate: '2026-12-01T12:00:00Z',
          },
        },
      };
    },
  };
});

async function openDetails() {
  render(<AiCreditsDetailsPopover>Kredyty AI 46 / 50</AiCreditsDetailsPopover>);
  await userEvent.click(screen.getByTestId('nav-chat-credits-details-btn'));
}

describe('AiCreditsDetailsPopover', () => {
  beforeEach(() => {
    access.canManageOrganization = false;
    apollo.queried = [];
  });
  afterEach(cleanup);

  it('nie odpytuje niczego, dopóki okienko jest zamknięte', () => {
    render(<AiCreditsDetailsPopover>Kredyty AI 46 / 50</AiCreditsDetailsPopover>);

    expect(apollo.queried).toEqual([]);
  });

  it('terapeuta widzi stan puli, ale historii nie odpytuje, bo backend jej nie da', async () => {
    await openDetails();

    expect(screen.getByTestId('nav-chat-credits-details-status')).toHaveTextContent('Zużyte w tym miesiącu4 / 50');
    expect(screen.getByTestId('nav-chat-credits-details-status')).toHaveTextContent('1 grudnia');
    expect(apollo.queried).not.toContain(GET_AI_CREDITS_HISTORY_QUERY);
    expect(screen.queryByTestId('nav-chat-credits-details-usage')).toBeNull();
    expect(screen.getByTestId('request-control')).toBeInTheDocument();
  });

  it('właściciel widzi podział zużycia i zwroty', async () => {
    access.canManageOrganization = true;
    await openDetails();

    expect(screen.getByTestId('nav-chat-credits-details-usage')).toHaveTextContent('Czat4');
    expect(screen.getByText('Zwrócone za nieudane wywołania: 1')).toBeInTheDocument();
  });
});
