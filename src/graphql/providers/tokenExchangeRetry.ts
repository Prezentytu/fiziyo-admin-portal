/**
 * The backend token could not be obtained after every attempt (network failure, aborted or
 * stalled request, Clerk not answering, backend 5xx). The operation must fail visibly instead
 * of going out without authorization or waiting forever.
 */
export class BackendTokenUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Nie udało się połączyć z serwerem logowania.', options);
    this.name = 'BackendTokenUnavailableError';
  }
}

class TokenStepTimeoutError extends Error {
  constructor(step: string, ms: number) {
    super(`${step} timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Transient = worth another attempt: no HTTP response at all (TypeError "Failed to fetch" /
 * "Load failed", AbortError, timeout) or a server-side failure (408, 429, 5xx). Responses such as
 * 401/403/404 carry a decision of the backend and are handled by the auth guards, so no retry.
 */
export function isTransientTokenExchangeError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== 'number') {
    return true;
  }
  return status === 408 || status === 429 || status >= 500;
}

/** Rejects when `run` does not settle within `ms`; `run` gets a signal aborted at that moment. */
export function withTimeout<T>(step: string, ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new TokenStepTimeoutError(step, ms));
    }, ms);
    run(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
