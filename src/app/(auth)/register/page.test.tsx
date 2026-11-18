import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from './page';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  prepare: vi.fn(),
  push: vi.fn(),
  pending: {
    status: null as string | null,
    emailAddress: null as string | null,
    unsafeMetadata: {} as Record<string, unknown>,
  },
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: { create: mocks.create, prepareEmailAddressVerification: mocks.prepare, ...mocks.pending },
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

describe('register page: „Powrót” z /verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending.status = 'missing_requirements';
    mocks.pending.emailAddress = 'gabinet@poczta.pl';
    mocks.pending.unsafeMetadata = {
      firstName: 'Jan',
      lastName: 'Nowak',
      phone: '+48600100200',
      companyName: 'Gabinet Ruch',
    };
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
    mocks.pending.status = null;
    mocks.pending.emailAddress = null;
    mocks.pending.unsafeMetadata = {};
  });

  it('wypełnia formularz z trwającej rejestracji i prosi tylko o hasło', () => {
    window.history.replaceState(null, '', '/register?powrot=1');
    render(<RegisterPage />);

    expect(screen.getByTestId('auth-register-email-banner-2')).toHaveTextContent('gabinet@poczta.pl');
    expect(screen.getByTestId('auth-register-restored')).toHaveTextContent('Wpisz hasło jeszcze raz.');
    expect(screen.getByTestId('auth-register-password-input')).toHaveValue('');

    fireEvent.change(screen.getByTestId('auth-register-password-input'), { target: { value: 'haslo1234' } });
    fireEvent.change(screen.getByTestId('auth-register-password-confirm-input'), { target: { value: 'haslo1234' } });
    fireEvent.click(screen.getByTestId('auth-register-next-btn'));

    expect(screen.getByTestId('auth-register-firstname-input')).toHaveValue('Jan');
    expect(screen.getByTestId('auth-register-lastname-input')).toHaveValue('Nowak');
    expect(screen.getByText('Gabinet Ruch')).toBeInTheDocument();
  });

  it('bez parametru powrotu zaczyna od pustego kroku 1', () => {
    render(<RegisterPage />);

    expect(screen.getByTestId('auth-register-email-input')).toHaveValue('');
    expect(screen.queryByTestId('auth-register-restored')).not.toBeInTheDocument();
  });
});
