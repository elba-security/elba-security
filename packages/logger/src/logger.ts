import { serializeLogObject } from './serialize';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerOptions = {
  env?: string;
};

export class Logger {
  env: string;

  constructor({ env }: LoggerOptions) {
    this.env = env || 'unknown';
  }

  private prepareLogMessage(message: string, info?: object): object {
    const logObject = { message, ...info };
    return serializeLogObject(logObject, this.env !== 'development');
  }

  private log(level: LogLevel, message: object): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

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
  }
}
