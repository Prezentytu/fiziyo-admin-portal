import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from './page';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  prepare: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: { create: mocks.create, prepareEmailAddressVerification: mocks.prepare },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

const fillAndSubmit = async () => {
  fireEvent.change(screen.getByTestId('auth-register-email-input'), { target: { value: 'gabinet@poczta.pl' } });
  fireEvent.click(screen.getByTestId('auth-register-next-btn'));
  fireEvent.change(screen.getByTestId('auth-register-password-input'), { target: { value: 'haslo1234' } });
  fireEvent.change(screen.getByTestId('auth-register-password-confirm-input'), { target: { value: 'haslo1234' } });
  fireEvent.click(screen.getByTestId('auth-register-next-btn'));
  fireEvent.change(screen.getByTestId('auth-register-firstname-input'), { target: { value: 'Jan' } });
  fireEvent.change(screen.getByTestId('auth-register-lastname-input'), { target: { value: 'Nowak' } });
  await act(async () => {
    fireEvent.click(screen.getByTestId('auth-register-submit-btn'));
  });
};

describe('register page: błędy z Clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  it('hasło z wycieku: polski komunikat, link prowadzi do kroku hasła z zachowanymi danymi', async () => {
    mocks.create.mockRejectedValue({
      errors: [{ code: 'form_password_pwned', message: 'Password has been found in an online data breach.' }],
    });
    render(<RegisterPage />);
    await fillAndSubmit();

    const errorBox = screen.getByTestId('auth-register-error');
    expect(errorBox).toHaveTextContent('To hasło wyciekło kiedyś w internecie.');
    expect(errorBox).not.toHaveTextContent(/breach|Błąd rejestracji/);

    fireEvent.click(screen.getByTestId('auth-register-error-fix'));

    expect(screen.getByTestId('auth-register-password-input')).toHaveValue('haslo1234');
    expect(screen.getByTestId('auth-register-email-banner-2')).toHaveTextContent('gabinet@poczta.pl');
    expect(screen.queryByTestId('auth-register-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('auth-register-next-btn'));
    expect(screen.getByTestId('auth-register-firstname-input')).toHaveValue('Jan');
  });

  it('zajęty e-mail prowadzi do kroku e-mail', async () => {
    mocks.create.mockRejectedValue({ errors: [{ code: 'form_identifier_exists', message: 'That email is taken.' }] });
    render(<RegisterPage />);
    await fillAndSubmit();

    expect(screen.getByTestId('auth-register-error-fix')).toHaveTextContent('Zmień adres e-mail');
    fireEvent.click(screen.getByTestId('auth-register-error-fix'));
    expect(screen.getByTestId('auth-register-email-input')).toHaveValue('gabinet@poczta.pl');
  });
});

describe('register page: link polecający (SPEC-054)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.create.mockResolvedValue(undefined);
    mocks.prepare.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('kod z ?ref= trafia do unsafeMetadata.referralCode', async () => {
    window.history.replaceState(null, '', '/register?ref=przem-7k3d');
    render(<RegisterPage />);
    await fillAndSubmit();

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ unsafeMetadata: expect.objectContaining({ referralCode: 'PRZEM-7K3D' }) })
    );
  });

  it('kod przetrwa powrót na /register bez parametru (sessionStorage)', async () => {
    window.history.replaceState(null, '', '/register?ref=PRZEM-7K3D');
    const first = render(<RegisterPage />);
    first.unmount();
    window.history.replaceState(null, '', '/register');
    render(<RegisterPage />);
    await fillAndSubmit();

    expect(mocks.create.mock.calls[0][0].unsafeMetadata.referralCode).toBe('PRZEM-7K3D');
  });

  it('bez kodu metadane nie mają pola referralCode', async () => {
    window.history.replaceState(null, '', '/register');
    render(<RegisterPage />);
    await fillAndSubmit();

    expect(mocks.create.mock.calls[0][0].unsafeMetadata).not.toHaveProperty('referralCode');
  });
});
