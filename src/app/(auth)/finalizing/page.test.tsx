import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FinalizingRegistrationPage from './page';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  replace: vi.fn(),
  exchangeClerkToken: vi.fn(),
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
});
