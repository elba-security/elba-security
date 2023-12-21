import { Logger } from '@elba-security/logger';

export const logger = new Logger({ env: process.env.VERCEL_ENV });
