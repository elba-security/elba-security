import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_SOURCE_ID: z.string().uuid(),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
    SENTRY_API_BASE_URL: z.string().url().default('https://sentry.io/api/0'),
    SENTRY_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    SENTRY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    SENTRY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
