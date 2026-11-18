import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  forgetRegistrationAttempt,
  getRememberedRegistrationAttempt,
  rememberRegistrationAttempt,
  reportRegistrationStep,
} from '../registrationAttempts';

const SIGN_UP_ID = 'sua_2abcDEF123456';

describe('reportRegistrationStep', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('wysyła krok z platformą web i keepalive', () => {
    reportRegistrationStep({ signUpId: SIGN_UP_ID, step: 'code_sent', accountKind: 'company', email: 'a@b.pl' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/registration-attempts');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(JSON.parse(init.body)).toEqual({
      signUpId: SIGN_UP_ID,
      step: 'code_sent',
      platform: 'web',
      accountKind: 'company',
      email: 'a@b.pl',
    });
  });

  it('nic nie wysyła bez poprawnego signUpId', () => {
    reportRegistrationStep({ signUpId: undefined, step: 'code_sent' });
    reportRegistrationStep({ signUpId: null, step: 'code_sent' });
    reportRegistrationStep({ signUpId: 'user_123', step: 'code_sent' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('połyka odrzucony fetch i wyjątek synchroniczny', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(() => reportRegistrationStep({ signUpId: SIGN_UP_ID, step: 'code_error' })).not.toThrow();
    await Promise.resolve();

    fetchMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => reportRegistrationStep({ signUpId: SIGN_UP_ID, step: 'code_error' })).not.toThrow();
  });

  it('przerywa żądanie po 5 s', () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));

    reportRegistrationStep({ signUpId: SIGN_UP_ID, step: 'completed' });
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(signal.aborted).toBe(true);

    vi.useRealTimers();
  });
});

describe('zapamiętana próba rejestracji', () => {
  it('zapisuje, odczytuje i usuwa próbę', () => {
    rememberRegistrationAttempt({ signUpId: SIGN_UP_ID, accountKind: 'company' });
    expect(getRememberedRegistrationAttempt()).toEqual({ signUpId: SIGN_UP_ID, accountKind: 'company' });

    forgetRegistrationAttempt();
    expect(getRememberedRegistrationAttempt()).toBeNull();
  });
});
