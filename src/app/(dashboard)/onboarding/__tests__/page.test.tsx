import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from '../page';

const mocks = vi.hoisted(() => ({
  user: { id: 'clerk-user-1', unsafeMetadata: {}, primaryEmailAddress: null },
  getToken: vi.fn(), exchange: vi.fn(), clearToken: vi.fn(), signOut: vi.fn(), push: vi.fn(), replace: vi.fn(),
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: mocks.user }),
  useAuth: () => ({ getToken: mocks.getToken }),
  useClerk: () => ({ signOut: mocks.signOut }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/tokenCache', () => ({ clearBackendToken: mocks.clearToken }));
vi.mock('@/services/tokenExchangeService', () => ({ tokenExchangeService: { exchangeClerkToken: mocks.exchange } }));

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

describe('onboarding authentication', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.user = { id: 'clerk-user-1', unsafeMetadata: {}, primaryEmailAddress: null };
    mocks.getToken.mockReset().mockResolvedValue('clerk-session');
    mocks.exchange.mockReset().mockResolvedValue({ access_token: 'backend-session' });
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('location', { href: 'https://portal.example/onboarding', replace: mocks.replace });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('uses token exchange only and reloads providers after success', async () => {
    render(<OnboardingPage />);
    await flush();
    expect(mocks.exchange).toHaveBeenCalledWith('clerk-session');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Konto skonfigurowane!')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(mocks.replace).toHaveBeenCalledWith('https://portal.example/');
  });

  it.each([401, 403])('does not create organizations or retry authorization refusal %s', async (status) => {
    mocks.exchange.mockRejectedValue(Object.assign(new Error('private backend detail'), { status }));
    render(<OnboardingPage />);
    await flush();
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(mocks.exchange).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/private backend detail/)).not.toBeInTheDocument();
    expect(screen.getByTestId('onboarding-retry-btn')).toBeInTheDocument();
  });

  it('bounds transient retries and allows a manual retry', async () => {
    mocks.exchange.mockRejectedValue(new Error('offline'));
    render(<OnboardingPage />);
    await flush();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mocks.exchange).toHaveBeenCalledTimes(3);
    mocks.exchange.mockResolvedValue({ access_token: 'backend-session' });
    fireEvent.click(screen.getByTestId('onboarding-retry-btn'));
    await flush();
    expect(screen.getByText('Konto skonfigurowane!')).toBeInTheDocument();
  });

  it('does not accept a response without a backend token', async () => {
    mocks.exchange.mockResolvedValue({});
    render(<OnboardingPage />);
    await flush();
    expect(mocks.clearToken).not.toHaveBeenCalled();
    expect(screen.queryByText('Konto skonfigurowane!')).not.toBeInTheDocument();
  });

  it('ignores an old account response after switching users', async () => {
    let complete: (value: { access_token: string }) => void = () => { throw new Error('Not started'); };
    mocks.exchange.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const view = render(<OnboardingPage />);
    await flush();
    mocks.user = { ...mocks.user, id: 'clerk-user-2' };
    mocks.exchange.mockRejectedValue(Object.assign(new Error('Denied'), { status: 403 }));
    view.rerender(<OnboardingPage />);
    await flush();
    await act(async () => complete({ access_token: 'old-account-token' }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(mocks.clearToken).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('cancels pending navigation when leaving the screen', async () => {
    const view = render(<OnboardingPage />);
    await flush();
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});