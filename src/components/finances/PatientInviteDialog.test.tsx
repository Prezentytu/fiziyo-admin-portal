import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientInviteDialog } from './PatientInviteDialog';

const createInviteMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [createInviteMock, { loading: false }] as const,
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="mock-qr-code" />,
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
});
