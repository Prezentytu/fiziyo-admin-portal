import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientInviteDialog } from './PatientInviteDialog';
import type { CreatePatientInviteLinkResponse } from '@/types/apollo';

const { inviteHarness } = vi.hoisted(() => ({
  inviteHarness: {
    loading: false,
    completeWith: null as CreatePatientInviteLinkResponse | null,
    mutate: vi.fn(),
  },
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: (
    _doc: unknown,
    options?: { onCompleted?: (data: CreatePatientInviteLinkResponse) => void }
  ) => {
    inviteHarness.mutate.mockImplementation(async () => {
      if (inviteHarness.completeWith) {
        options?.onCompleted?.(inviteHarness.completeWith);
      }
    });
    return [inviteHarness.mutate, { get loading() { return inviteHarness.loading; } }] as const;
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="mock-qr-code" data-value={value} />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PatientInviteDialog unified invite flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteHarness.loading = false;
    inviteHarness.completeWith = null;
    inviteHarness.mutate.mockReset();
  });

  it('renderuje trzy spójne kanały zaproszenia', () => {
    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    expect(screen.getByTestId('invite-tab-link')).toHaveTextContent('Link');
    expect(screen.getByTestId('invite-tab-qr')).toHaveTextContent('QR kod');
    expect(screen.getByTestId('invite-tab-send')).toHaveTextContent('Wyślij');
  });

  it('aktywuje wysyłkę po wpisaniu poprawnego emaila', async () => {
    const user = userEvent.setup();

    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await user.click(screen.getByTestId('invite-tab-send'));

    const sendButton = screen.getByTestId('invite-send-btn');
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByTestId('invite-email-input'), 'pacjent@example.com');

    expect(sendButton).toBeEnabled();
  });

  it('shows unavailable QR after mutation without token', async () => {
    const user = userEvent.setup();
    inviteHarness.completeWith = {
      createPatientInviteLink: { success: true },
    };

    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await waitFor(() => expect(inviteHarness.mutate).toHaveBeenCalled());
    await user.click(screen.getByTestId('invite-tab-qr'));

    expect(screen.getByTestId('invite-qr-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-code')).not.toBeInTheDocument();
    expect(screen.getByTestId('invite-qr-copy-btn')).toBeDisabled();
  });

  it('encodes https invite token in QR when mutation returns a code', async () => {
    const user = userEvent.setup();
    inviteHarness.completeWith = {
      createPatientInviteLink: { success: true, token: 'abc-123' },
    };

    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await waitFor(() => expect(inviteHarness.mutate).toHaveBeenCalled());
    await user.click(screen.getByTestId('invite-tab-qr'));

    expect(screen.getByTestId('invite-qr-code')).toHaveAttribute(
      'data-qr-url',
      'https://fiziyo.pl/start?token=abc-123'
    );
    expect(screen.getByTestId('mock-qr-code')).toHaveAttribute(
      'data-value',
      'https://fiziyo.pl/start?token=abc-123'
    );
    expect(screen.queryByTestId('invite-qr-unavailable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('invite-qr-copy-btn')).toBeEnabled();
  });
});
