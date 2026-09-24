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

  it('scala QR i link w jednym kanale, a wysyłkę trzyma osobno', () => {
    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    expect(screen.getByTestId('invite-tab-qr')).toHaveTextContent('QR i link');
    expect(screen.getByTestId('invite-tab-send')).toHaveTextContent('Wyślij');
    expect(screen.queryByTestId('invite-tab-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('invite-copy-main-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-copy-inline-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-copy-btn')).not.toBeInTheDocument();
  });

  it('nie oznacza imienia jako opcjonalnego w etykiecie ani w placeholderze', () => {
    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    expect(screen.getByLabelText('Imię pacjenta')).toBeInTheDocument();
    expect(screen.getByTestId('invite-name-input')).toHaveAttribute('placeholder', 'Imię pacjenta');
    expect(screen.queryByPlaceholderText(/opcjonalne/i)).not.toBeInTheDocument();
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
    inviteHarness.completeWith = {
      createPatientInviteLink: { success: true },
    };

    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await waitFor(() => expect(inviteHarness.mutate).toHaveBeenCalled());

    expect(screen.getByTestId('invite-qr-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-qr-code')).not.toBeInTheDocument();
    expect(screen.getByTestId('invite-copy-main-btn')).toBeDisabled();
  });

  it('encodes https invite token in QR when mutation returns a code', async () => {
    inviteHarness.completeWith = {
      createPatientInviteLink: { success: true, token: 'abc-123' },
    };

    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    await waitFor(() => expect(inviteHarness.mutate).toHaveBeenCalled());

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
    expect(screen.getByTestId('invite-copy-main-btn')).toBeEnabled();
  });
});
