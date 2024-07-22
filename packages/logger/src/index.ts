import { Logger } from './logger';

export { Logger, type LoggerOptions } from './logger';

export const logger = new Logger({
  env: process.env.VERCEL_ENV,
});
