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
    MONDAY_API_BASE_URL: z.string().url(),
    MONDAY_API_VERSION: z.string().min(1).default('2024-04'),
    MONDAY_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    MONDAY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(400),
    MONDAY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
