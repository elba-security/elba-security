import { Logger } from './logger';

export { Logger, SkipSentryError, type LoggerOptions } from './logger';

export const logger = new Logger({
  env: process.env.VERCEL_ENV,
  enableSentry: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true',
});
