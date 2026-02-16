type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  readonly module?: string;
  readonly [key: string]: unknown;
}

interface AppLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function createConsoleLogger(): AppLogger {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const prefix = context?.module ? `[${context.module}]` : '';
    const { module: _module, ...rest } = context ?? {};
    const hasExtra = Object.keys(rest).length > 0;

    const args: unknown[] = [`${prefix} ${message}`.trim()];
    if (hasExtra) {
      args.push(rest);
    }

    switch (level) {
      case 'debug':
        console.debug(...args);
        break;
      case 'info':
        console.info(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, err, context) => {
      log('error', `${message}: ${formatError(err)}`, context);
    },
  };
}

function createNoopLogger(): AppLogger {
  const noop = () => {};
  return { debug: noop, info: noop, warn: noop, error: noop };
}

export const logger: AppLogger =
  process.env.NODE_ENV === 'production' ? createNoopLogger() : createConsoleLogger();

export function createModuleLogger(module: string): AppLogger {
  return {
    debug: (message, context) => logger.debug(message, { ...context, module }),
    info: (message, context) => logger.info(message, { ...context, module }),
    warn: (message, context) => logger.warn(message, { ...context, module }),
    error: (message, err, context) => logger.error(message, err, { ...context, module }),
  };
}

export type { AppLogger, LogContext, LogLevel };
