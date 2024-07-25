import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    LAUNCHDARKLY_API_BASE_URL: z.string().min(1).default('https://app.launchdarkly.com'),
    LAUNCHDARKLY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    LAUNCHDARKLY_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    VERCEL_ENV: z.string().min(1).optional(),
    LAUNCHDARKLY_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    LAUNCHDARKLY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(20),
  })
  .parse(process.env);
