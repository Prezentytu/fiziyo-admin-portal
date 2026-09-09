import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SignInPage from './page';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useSignIn: () => ({
    isLoaded: true,
    setActive: mocks.setActive,
    signIn: { create: mocks.create },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

describe('sign-in page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({
      createdSessionId: 'session-1',
      status: 'complete',
    });
    mocks.setActive.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it('renders the Clerk CAPTCHA mount before authentication starts', () => {
    render(<SignInPage />);

    expect(document.getElementById('clerk-captcha')).toBeInTheDocument();
  });

  it('activates the completed Clerk session and opens the dashboard', async () => {
    render(<SignInPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'physio@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Hasło'), {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        identifier: 'physio@example.com',
        password: 'secret-password',
      });
    });
    expect(mocks.setActive).toHaveBeenCalledWith({ session: 'session-1' });
    expect(mocks.replace).toHaveBeenCalledWith('/');
  });

  it('does not reveal whether the account exists', async () => {
    mocks.create.mockRejectedValue({
      errors: [{ code: 'form_identifier_not_found', message: 'Account not found' }],
    });
    render(<SignInPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'unknown@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Hasło'), {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByText('Nieprawidłowy email lub hasło')).toBeInTheDocument();
    expect(screen.queryByText('Account not found')).not.toBeInTheDocument();
  });
});
