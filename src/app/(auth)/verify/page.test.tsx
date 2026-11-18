import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import VerifyEmailPage from './page';
import { CODE_HELP_DELAY_S } from '@/lib/auth/verificationCodeHelp';

const mocks = vi.hoisted(() => ({
  attempt: vi.fn(),
  prepare: vi.fn(),
  update: vi.fn(),
  replace: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    setActive: mocks.setActive,
    signUp: {
      emailAddress: 'gabinet.ruch@poczta.pl',
      update: mocks.update,
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

describe('verify page: adres i jego poprawka', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('pokazuje adres, na który poszedł kod', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByTestId('auth-verify-email')).toHaveTextContent('gabinet.ruch@poczta.pl');
  });

  it('poprawka adresu wysyła kod na nowy adres w tej samej rejestracji', async () => {
    const updatedPrepare = vi.fn().mockResolvedValue({});
    mocks.update.mockResolvedValue({
      emailAddress: 'gabinet@poczta.pl',
      prepareEmailAddressVerification: updatedPrepare,
    });
    render(<VerifyEmailPage />);

    fireEvent.click(screen.getByTestId('auth-verify-change-email-btn'));
    fireEvent.change(screen.getByTestId('auth-verify-email-input'), { target: { value: ' gabinet@poczta.pl ' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-email-save-btn'));
    });

    expect(mocks.update).toHaveBeenCalledWith({ emailAddress: 'gabinet@poczta.pl' });
    expect(updatedPrepare).toHaveBeenCalledWith({ strategy: 'email_code' });
    expect(screen.getByTestId('auth-verify-email')).toHaveTextContent('gabinet@poczta.pl');
    expect(screen.getByTestId('auth-verify-email-changed')).toHaveTextContent(
      'Wysłaliśmy kod na nowy adres gabinet@poczta.pl.'
    );
  });

  it('ten sam adres po prostu wysyła nowy kod, bez błędu', async () => {
    mocks.prepare.mockResolvedValue({});
    render(<VerifyEmailPage />);

    fireEvent.click(screen.getByTestId('auth-verify-change-email-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-email-save-btn'));
    });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledWith({ strategy: 'email_code' });
    expect(screen.queryByTestId('auth-verify-email-error')).not.toBeInTheDocument();
  });

  it('zajęty adres: polski komunikat zamiast tekstu Clerk', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.update.mockRejectedValue({
      errors: [{ code: 'form_identifier_exists', message: 'That email address is taken.' }],
    });
    render(<VerifyEmailPage />);

    fireEvent.click(screen.getByTestId('auth-verify-change-email-btn'));
    fireEvent.change(screen.getByTestId('auth-verify-email-input'), { target: { value: 'ktos@poczta.pl' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-email-save-btn'));
    });

    expect(screen.getByTestId('auth-verify-email-error')).toHaveTextContent(
      'Masz już konto z tym adresem. Zaloguj się albo użyj innego e-maila.'
    );
  });
});

describe('verify page: zły kod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  it('pierwszy zły kod od razu pokazuje podpowiedź, bez czekania', async () => {
    mocks.attempt.mockRejectedValue({ errors: [{ code: 'form_code_incorrect', message: 'Incorrect code' }] });
    render(<VerifyEmailPage />);

    fireEvent.change(screen.getByTestId('auth-verify-code-input'), { target: { value: '000000' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('auth-verify-submit-btn'));
    });

    expect(screen.getByText('Nieprawidłowy kod weryfikacyjny')).toBeInTheDocument();
    expect(screen.getByTestId('auth-verify-code-help')).toBeInTheDocument();
  });
});
