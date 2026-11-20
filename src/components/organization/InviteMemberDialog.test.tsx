import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteMemberDialog } from './InviteMemberDialog';

const sendInvitationMock = vi.fn();
const generateInviteLinkMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const isCombinedGraphQLErrorMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (mutationDocument: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = mutationDocument.definitions?.[0]?.name?.value;

    if (operationName === 'SendInvitation') {
      return [sendInvitationMock, { loading: false }] as const;
    }

    if (operationName === 'GenerateInviteLink') {
      return [generateInviteLinkMock, { loading: false }] as const;
    }

    return [vi.fn(), { loading: false }] as const;
  },
}));

vi.mock('@apollo/client/errors', () => ({
  CombinedGraphQLErrors: {
    is: (error: unknown) => isCombinedGraphQLErrorMock(error),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCombinedGraphQLErrorMock.mockImplementation((error: unknown) => {
      const combinedError = error as { isCombinedGraphQLError?: boolean };
      return combinedError?.isCombinedGraphQLError === true;
    });
  });

  it('kopiuje pełny adres długiego zaproszenia dopiero po kliknięciu przycisku', async () => {
    const user = userEvent.setup();
    const token = 'testowy-token-'.repeat(20);
    const url = `${window.location.origin}/invite?token=${token}`;
    const previousClipboard = 'Tekst w schowku przed wygenerowaniem linku';
    await navigator.clipboard.writeText(previousClipboard);
    generateInviteLinkMock.mockResolvedValueOnce({
      data: {
        generateInviteLink: {
          invitationToken: token,
          role: 'ADMIN',
          expiresAt: '2026-11-27T12:00:00Z',
        },
      },
    });

    render(<InviteMemberDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await user.click(screen.getByTestId('org-invite-tab-link'));
    await user.click(screen.getByTestId('org-invite-generate-link-btn'));
    const copyButton = await screen.findByRole('button', { name: 'Kopiuj link' });

    expect(screen.getByRole('textbox', { name: 'Link zaproszenia' })).toHaveValue(url);
    expect(await navigator.clipboard.readText()).toBe(previousClipboard);
    expect(toastSuccessMock).toHaveBeenCalledExactlyOnceWith('Link zaproszenia jest gotowy');

    await user.click(copyButton);
    expect(await navigator.clipboard.readText()).toBe(url);
    expect(toastSuccessMock).toHaveBeenLastCalledWith('Link skopiowany do schowka');
  });

  it('nie pokazuje juz dialogu LimitReached dla bledow GraphQL (model pay-as-you-go)', async () => {
    const user = userEvent.setup();
    generateInviteLinkMock.mockRejectedValueOnce({
      isCombinedGraphQLError: true,
      errors: [
        {
          message: 'Nieoczekiwany blad serwera.',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
    });

    render(
      <InviteMemberDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
      />
    );

    await user.click(screen.getByTestId('org-invite-tab-link'));
    await user.click(screen.getByTestId('org-invite-generate-link-btn'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Nieoczekiwany blad serwera.');
    });

    expect(screen.queryByTestId('common-limit-reached-dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ulepsz do/i)).not.toBeInTheDocument();
  });

  it('pokazuje pierwszy błąd GraphQL dla standardowego błędu invite', async () => {
    const user = userEvent.setup();
    generateInviteLinkMock.mockRejectedValueOnce({
      isCombinedGraphQLError: true,
      errors: [
        {
          message: 'Zaproszenie dla tej roli już istnieje.',
          extensions: { code: 'INVITATION_ALREADY_EXISTS' },
        },
      ],
    });

    render(
      <InviteMemberDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
      />
    );

    await user.click(screen.getByTestId('org-invite-tab-link'));
    await user.click(screen.getByTestId('org-invite-generate-link-btn'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Zaproszenie dla tej roli już istnieje.');
    });
  });
});
