import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createModuleLogger } from '../logger';

describe('createModuleLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a logger with module prefix', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const moduleLogger = createModuleLogger('TestModule');

    moduleLogger.debug('hello');

    expect(debugSpy).toHaveBeenCalledWith('[TestModule] hello');
  });

  it('includes extra context alongside module prefix', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const moduleLogger = createModuleLogger('Auth');

    moduleLogger.info('login attempt', { userId: '123' });

    expect(infoSpy).toHaveBeenCalledWith('[Auth] login attempt', expect.objectContaining({ userId: '123' }));
  });

  it('logs errors with formatted message', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const moduleLogger = createModuleLogger('Auth');

    moduleLogger.error('failed', new Error('token expired'));

    expect(errorSpy).toHaveBeenCalledWith('[Auth] failed: token expired');
  });

  it('logs errors with non-Error objects', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const moduleLogger = createModuleLogger('Net');

    moduleLogger.error('request failed', 'timeout');

    expect(errorSpy).toHaveBeenCalledWith('[Net] request failed: timeout');
  });
});
