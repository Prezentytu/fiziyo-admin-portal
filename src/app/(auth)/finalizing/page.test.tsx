import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FinalizingRegistrationPage from './page';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  replace: vi.fn(),
  exchangeClerkToken: vi.fn(),
  reportRegistrationStep: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mocks.getToken, isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { exchangeClerkToken: mocks.exchangeClerkToken },
}));

vi.mock('@/lib/registrationAttempts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/registrationAttempts')>()),
  reportRegistrationStep: mocks.reportRegistrationStep,
}));

vi.mock('@/lib/auth/jwtClaims', () => ({ getUserRoleFromToken: () => 'owner' }));

describe('finalizing page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // Clerk 7: getToken() bez sieci rzuca ClerkOfflineError zamiast zwracać null.
  it('keeps polling when getToken throws while offline', async () => {
    mocks.getToken.mockRejectedValueOnce(new Error('ClerkOfflineError')).mockResolvedValue(null);

    render(<FinalizingRegistrationPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.getToken).toHaveBeenCalledTimes(2);
  });

  it('zgłasza finalizing_timeout po czasie oczekiwania i completed po pojawieniu się konta', async () => {
    sessionStorage.setItem(
      'REGISTRATION_ATTEMPT',
      JSON.stringify({ signUpId: 'sua_2abcDEF123456', accountKind: 'company' })
    );
    mocks.getToken.mockResolvedValue(null);

    render(<FinalizingRegistrationPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000 * 30);
    });

    expect(mocks.reportRegistrationStep).toHaveBeenCalledTimes(1);
    expect(mocks.reportRegistrationStep).toHaveBeenCalledWith({
      signUpId: 'sua_2abcDEF123456',
      accountKind: 'company',
      step: 'finalizing_timeout',
    });

    mocks.getToken.mockResolvedValue('clerk-token');
    mocks.exchangeClerkToken.mockResolvedValue({ access_token: 'backend-token' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.reportRegistrationStep).toHaveBeenLastCalledWith({
      signUpId: 'sua_2abcDEF123456',
      accountKind: 'company',
      step: 'completed',
    });
    expect(sessionStorage.getItem('REGISTRATION_ATTEMPT')).toBeNull();
  });
});
