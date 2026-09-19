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

  it('scala QR i link w jednym kanale, a wysyłkę trzyma osobno', () => {
    render(<PatientInviteDialog open onOpenChange={vi.fn()} organizationId="org-1" />);

    expect(screen.getByTestId('invite-tab-qr')).toHaveTextContent('QR i link');
    expect(screen.getByTestId('invite-tab-send')).toHaveTextContent('Wyślij');
    expect(screen.queryByTestId('invite-tab-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('invite-qr-code')).toBeInTheDocument();
    expect(screen.getByTestId('invite-copy-main-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-copy-inline-btn')).not.toBeInTheDocument();
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
});
