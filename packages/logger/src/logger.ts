import * as Sentry from '@sentry/nextjs';
import { enrichError, serializeLogObject } from './serialize';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerOptions = {
  env?: string;
  enableSentry: boolean;
};

export class Logger {
  env: string;
  enableSentry: boolean;

  constructor({ env, enableSentry }: LoggerOptions) {
    this.env = env || 'unknown';
    this.enableSentry = enableSentry;
  }

  private prepareLogMessage(message: string, info?: object): object {
    const logObject = { message, ...info };
    return serializeLogObject(logObject, this.env !== 'development');
  }

  private log(level: LogLevel, message: object): void {
    try {
      // eslint-disable-next-line no-console -- this is a console logger
      console[level](
        JSON.stringify(
          {
            level,
            ...message,
          },
          null,
          this.env === 'development' ? 2 : 0
        )
      );
    } catch (e: any) {
      // eslint-disable-next-line no-console -- this is a console logger
      console.error(
        JSON.stringify({
          message: 'failed to log',
          error: e?.message,
        })
      );
    }
  }

  info(message: string, info?: object) {
    this.log('info', this.prepareLogMessage(message, info));
  }

  debug(message: string, info?: object) {
    this.log('debug', this.prepareLogMessage(message, info));
  }

  warn(message: string, info?: object) {
    this.log('warn', this.prepareLogMessage(message, info));
  }

  error(message: string, info?: object) {
    try {
      this.log('error', this.prepareLogMessage(message, info));
    } catch (e: any) {
      this.log('error', {
        message: 'Failed to log error',
        errorMessage: e?.message,
        stack: e?.stack,
      });
    }

    if (this.enableSentry && !isSkipSentryError(info)) {
      const customProperties = {
        message,
        error: info instanceof Error ? enrichError(info) : undefined,
        ...info,
      };
      Sentry.setContext('Custom Properties', customProperties);
      Sentry.captureException(customProperties);
    }
  }
}

export const isSkipSentryError = (error: any) => {
  let currentError = error;
  while (currentError) {
    if (currentError instanceof SkipSentryError) {
      return true;
    }
    currentError = currentError.cause;
  }

  return false;
};

export class SkipSentryError extends Error {
  constructor(...errorArgs: ConstructorParameters<typeof Error>) {
    super(...errorArgs);
    Object.defineProperty(this, 'name', { value: 'SkipSentryError' });
  }
}
