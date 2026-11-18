import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import VerifyEmailPage from './page';
import { CODE_HELP_DELAY_S } from '@/lib/auth/verificationCodeHelp';

const mocks = vi.hoisted(() => ({
  attempt: vi.fn(),
  prepare: vi.fn(),
  replace: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    setActive: mocks.setActive,
    signUp: {
      attemptEmailAddressVerification: mocks.attempt,
      prepareEmailAddressVerification: mocks.prepare,
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('verify page: podpowiedź, gdy kod nie dochodzi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('pojawia się dopiero po czasie oczekiwania i kieruje na kontakt@fiziyo.pl', async () => {
    render(<VerifyEmailPage />);

    await advance(CODE_HELP_DELAY_S * 1000 - 1);
    expect(screen.queryByTestId('auth-verify-code-help')).not.toBeInTheDocument();

    await advance(1);
    expect(screen.getByTestId('auth-verify-code-help')).toBeInTheDocument();
    const mail = screen.getByTestId('auth-verify-code-help-mail');
    expect(mail).toHaveTextContent('kontakt@fiziyo.pl');
    expect(mail.getAttribute('href')).toMatch(/^mailto:kontakt@fiziyo\.pl\?subject=/);
  });

  it('wysłanie nowego kodu chowa podpowiedź i odlicza czas od nowa', async () => {
    mocks.prepare.mockResolvedValue({});
    render(<VerifyEmailPage />);

    await advance(CODE_HELP_DELAY_S * 1000);
    expect(screen.getByTestId('auth-verify-code-help')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-resend-btn'));
    });
    expect(mocks.prepare).toHaveBeenCalledWith({ strategy: 'email_code' });
    expect(screen.queryByTestId('auth-verify-code-help')).not.toBeInTheDocument();

    await advance(CODE_HELP_DELAY_S * 1000 - 1);
    expect(screen.queryByTestId('auth-verify-code-help')).not.toBeInTheDocument();

    await advance(1);
    expect(screen.getByTestId('auth-verify-code-help')).toBeInTheDocument();
  });

  it('nieudane wysłanie nowego kodu nie resetuje licznika', async () => {
    mocks.prepare.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<VerifyEmailPage />);

    await advance(CODE_HELP_DELAY_S * 1000);
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-resend-btn'));
    });
    expect(screen.getByTestId('auth-verify-code-help')).toBeInTheDocument();
  });
});
