import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    SENTRY_API_BASE_URL: z.string().url().default('https://sentry.io/api/0'),
    SENTRY_APP_INSTALL_URL: z.string().url().default('https://sentry.io/oauth'),
    SENTRY_CLIENT_ID: z.string().min(1),
    SENTRY_CLIENT_SECRET: z.string().min(1),
    SENTRY_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    SENTRY_REDIRECT_URI: z.string().url(),
    SENTRY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    SENTRY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    TOKEN_REFRESH_CRON: z.string().default('0 */6 * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
